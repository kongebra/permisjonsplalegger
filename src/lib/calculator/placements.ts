/**
 * Plasseringsvalgene i «Ny periode»: hvor ferie, ulønnet permisjon eller annet
 * kan legges i forhold til permisjonen til valgt forelder.
 *
 * Datoene hentes fra permisjonens faktiske start og slutt (`LeaveResult`), slik
 * at de følger med hvis permisjonen flyttes. Sluttdatoer er eksklusive internt
 * (dagen etter siste dag). I tekstene vises sluttdatoen inklusive.
 */

import { addDays, format, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { LeaveResult, Parent, ParentRights, PlannerPeriodType } from '../types';

export type PlacementId = 'before' | 'during' | 'after' | 'before-daycare' | 'custom';

export interface PlacementOption {
  id: PlacementId;
  label: string;
  /** Datolinjen under valget. Null for «Velg datoer selv». */
  description: string | null;
  /** Null for «Velg datoer selv», der brukeren velger datoene. */
  start: Date | null;
  /** Eksklusiv slutt. Null for «Velg datoer selv». */
  end: Date | null;
}

export interface PlacementInput {
  rights: ParentRights;
  parent: Parent;
  type: PlannerPeriodType;
  leaveResult: LeaveResult | undefined;
  /** Barnehagestart når barnehage er slått på, ellers null */
  daycareStart: Date | null | undefined;
  /** Lengden på perioden i kalenderdager, beholdes når brukeren bytter valg */
  durationDays: number;
}

/** Valget som er forhåndsvalgt når dialogen åpnes og når forelder byttes */
const DEFAULT_PLACEMENT_ID: PlacementId = 'after';

const DATE_FORMAT = 'd. MMM yyyy';

function formatPlacementDate(date: Date): string {
  return format(date, DATE_FORMAT, { locale: nb });
}

/** «23. nov. 2026 til 6. des. 2026» ut fra start og eksklusiv slutt */
export function formatPlacementRange(start: Date, exclusiveEnd: Date): string {
  return `${formatPlacementDate(start)} til ${formatPlacementDate(subDays(exclusiveEnd, 1))}`;
}

const TYPE_VERB: Record<Exclude<PlannerPeriodType, 'permisjon'>, string> = {
  ferie: 'ta ferie',
  ulonnet: 'ta ulønnet permisjon',
  annet: 'ha perioden',
};

/** Spørsmålet over valgene, f.eks. «Når skal mor ta ferie?» */
export function getPlacementQuestion(parent: Parent, type: PlannerPeriodType): string {
  const who = parent === 'mother' ? 'mor' : 'far';
  const verb = TYPE_VERB[type === 'permisjon' ? 'annet' : type];
  return `Når skal ${who} ${verb}?`;
}

/**
 * Hjelpetekst under valgene. Kun far er modellert med start på termin, så datoene
 * er anslag.
 */
export function getPlacementHint(rights: ParentRights, parent: Parent): string | null {
  if (rights === 'father-only' && parent === 'father') {
    return 'Far starter på beregnet termin i planen, så datoene er anslag.';
  }
  return null;
}

interface ParentLeave {
  start: Date;
  /** Eksklusiv slutt */
  end: Date;
  /** Slutten på mors seks første uker etter fødsel (bare for mor) */
  mandatoryEnd: Date | null;
}

/**
 * Permisjonen til forelderen, eller null når forelderen ikke har permisjon i
 * planen. Avgjøres av rettighet og antall uker, siden `LeaveResult` fyller inn
 * en tom periode for forelderen uten permisjon.
 */
function getParentLeave(
  rights: ParentRights,
  parent: Parent,
  leaveResult: LeaveResult,
): ParentLeave | null {
  const summary = parent === 'mother' ? leaveResult.mother : leaveResult.father;
  const hasLeave =
    parent === 'mother' ? rights !== 'father-only' : rights !== 'mother-only';
  if (!hasLeave || summary.weeks <= 0) return null;

  const mandatory =
    parent === 'mother'
      ? leaveResult.segments.find((s) => s.parent === 'mother' && s.type === 'mandatory')
      : undefined;

  return { start: summary.start, end: summary.end, mandatoryEnd: mandatory?.end ?? null };
}

/**
 * Fjerner valg som gir nøyaktig de samme datoene som et annet valg.
 * Det første valget beholdes, men forhåndsvalget har alltid forrang og beholdes
 * på sin plass. «Velg datoer selv» har ingen datoer og fjernes aldri.
 */
export function removeDuplicatePlacements(options: PlacementOption[]): PlacementOption[] {
  const result: PlacementOption[] = [];
  const indexByDates = new Map<string, number>();

  for (const option of options) {
    if (!option.start || !option.end) {
      result.push(option);
      continue;
    }
    const key = `${option.start.getTime()}-${option.end.getTime()}`;
    const existing = indexByDates.get(key);
    if (existing === undefined) {
      indexByDates.set(key, result.length);
      result.push(option);
    } else if (option.id === DEFAULT_PLACEMENT_ID) {
      result[existing] = option;
    }
  }
  return result;
}

/**
 * Valgene for en forelder og type, i den rekkefølgen de vises. Siste valg er
 * alltid «Velg datoer selv».
 */
export function getPlacementOptions(input: PlacementInput): PlacementOption[] {
  const { rights, parent, type, leaveResult, daycareStart } = input;
  const duration = Math.max(1, input.durationDays);
  const custom: PlacementOption = {
    id: 'custom',
    label: 'Velg datoer selv',
    description: null,
    start: null,
    end: null,
  };

  const leave = leaveResult ? getParentLeave(rights, parent, leaveResult) : null;
  if (!leaveResult || !leave) return [custom];

  const both = rights === 'both';
  const isMother = parent === 'mother';
  const noun = both ? (isMother ? 'mors permisjon' : 'fars permisjon') : 'permisjonen';
  const who = isMother ? 'Mor' : 'Far';

  const options: PlacementOption[] = [];

  // Før permisjonen: ferien slutter dagen før permisjonen starter
  if (type !== 'annet') {
    const lastDay = formatPlacementDate(subDays(leave.start, 1));
    const description = !both
      ? `Slutter ${lastDay}, dagen før permisjonen starter.`
      : isMother
        ? `Slutter ${lastDay}, dagen før mors permisjon starter.`
        : `Slutter ${lastDay}. Mor er hjemme da.`;
    options.push({
      id: 'before',
      label: `Før ${noun}`,
      description,
      start: subDays(leave.start, duration),
      end: leave.start,
    });
  }

  // I permisjonen: bare ferie, som gir foreldrepenger og feriepenger samtidig
  const duringStart = isMother ? leave.mandatoryEnd : leave.start;
  if (type === 'ferie' && duringStart) {
    const when = isMother ? 'Fra uke 7 etter fødselen' : `Fra ${formatPlacementDate(duringStart)}`;
    options.push({
      id: 'during',
      label: `I ${noun}`,
      description: `${when}. ${who} får foreldrepenger og feriepenger samtidig.`,
      start: duringStart,
      end: addDays(duringStart, duration),
    });
  }

  // Etter permisjonen (forhåndsvalgt)
  const afterDescription =
    both && isMother
      ? `Fra ${formatPlacementDate(leave.end)}. Far er hjemme.`
      : `Fra ${formatPlacementDate(leave.end)}, etter at permisjonen er over.`;
  options.push({
    id: 'after',
    label: `Etter ${noun}`,
    description: afterDescription,
    start: leave.end,
    end: addDays(leave.end, duration),
  });

  // Før barnehagestart: når mor er ferdig før far, og det er et gap etter fars permisjon
  if (type !== 'annet' && both && isMother && daycareStart && leaveResult.gap.days > 0) {
    options.push({
      id: 'before-daycare',
      label: 'Før barnehagestart',
      description: `Fra ${formatPlacementDate(leaveResult.gap.start)}, når fars permisjon er over.`,
      start: leaveResult.gap.start,
      end: addDays(leaveResult.gap.start, duration),
    });
  }

  return [...removeDuplicatePlacements(options), custom];
}

/** Valget som er forhåndsvalgt, eller det første valget hvis det ikke finnes */
export function getDefaultPlacementId(options: PlacementOption[]): PlacementId {
  return options.some((o) => o.id === DEFAULT_PLACEMENT_ID)
    ? DEFAULT_PLACEMENT_ID
    : (options[0]?.id ?? 'custom');
}
