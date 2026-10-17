import { describe, test, expect } from 'bun:test';
import { calculateLeave } from './dates';
import {
  formatPlacementRange,
  getDefaultPlacementId,
  getPlacementHint,
  getPlacementOptions,
  getPlacementQuestion,
  removeDuplicatePlacements,
  type PlacementInput,
  type PlacementOption,
} from './placements';
import type { Parent, ParentRights, PlannerPeriodType } from '../types';

/**
 * Hånd-regnet utgangspunkt: termin 15. juni 2026, 100 %, barnehage 1. august 2027.
 * Permisjonen starter 3 uker før termin, 25. mai 2026.
 *
 * Begge har rett, 8 fellesuker til mor:
 *   mor 3 + 15 + 8 = 26 uker, 25. mai 2026 til og med 22. nov. 2026 (slutt eksklusiv 23. nov.)
 *   mors seks uker etter fødsel (obligatorisk) slutter 27. juli 2026 (eksklusiv)
 *   far 15 + 8 = 23 uker, 23. nov. 2026 til og med 2. mai 2027 (slutt eksklusiv 3. mai)
 *   gapet går fra 3. mai 2027 til barnehagestart 1. august 2027
 * Kun mor: 49 uker, slutt eksklusiv 3. mai 2027.
 * Kun far: 40 uker fra termin 15. juni 2026, slutt eksklusiv 22. mars 2027.
 */
const DUE = new Date(2026, 5, 15);
const DAYCARE = new Date(2027, 7, 1);
const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);

function options(
  rights: ParentRights,
  parent: Parent,
  type: PlannerPeriodType = 'ferie',
  extra: Partial<PlacementInput> = {},
) {
  const leaveResult = calculateLeave(DUE, 100, rights, 8, 0, DAYCARE);
  return getPlacementOptions({
    rights,
    parent,
    type,
    leaveResult,
    daycareStart: DAYCARE,
    durationDays: 14,
    ...extra,
  });
}

/** Alt brukeren ser og får per valg, i visningsrekkefølge */
function summarize(list: PlacementOption[]) {
  return list.map((o) => ({
    id: o.id,
    label: o.label,
    description: o.description,
    start: o.start,
    end: o.end,
  }));
}

describe('begge har rett, Mor valgt', () => {
  test('ferie: før, i, etter og før barnehagestart, med hånd-regnede datoer', () => {
    expect(summarize(options('both', 'mother'))).toEqual([
      {
        id: 'before',
        label: 'Før mors permisjon',
        description: 'Slutter 24. mai 2026, dagen før mors permisjon starter.',
        start: d(2026, 5, 11),
        end: d(2026, 5, 25),
      },
      {
        id: 'during',
        label: 'I mors permisjon',
        description: 'Fra uke 7 etter fødselen. Mor får foreldrepenger og feriepenger samtidig.',
        start: d(2026, 7, 27),
        end: d(2026, 8, 10),
      },
      {
        id: 'after',
        label: 'Etter mors permisjon',
        description: 'Fra 23. nov. 2026. Far er hjemme.',
        start: d(2026, 11, 23),
        end: d(2026, 12, 7),
      },
      {
        id: 'before-daycare',
        label: 'Før barnehagestart',
        description: 'Fra 3. mai 2027, når fars permisjon er over.',
        start: d(2027, 5, 3),
        end: d(2027, 5, 17),
      },
      { id: 'custom', label: 'Velg datoer selv', description: null, start: null, end: null },
    ]);
  });

  test('Etter mors permisjon starter på mors siste permisjonsdag + 1 (UC-1)', () => {
    const after = options('both', 'mother').find((o) => o.id === 'after');
    // Mors siste permisjonsdag er 22. nov. 2026
    expect(after?.start).toEqual(d(2026, 11, 23));
  });

  test('Før mors permisjon slutter dagen før mors start, termin - 21 dager (UC-4)', () => {
    const before = options('both', 'mother').find((o) => o.id === 'before');
    expect(before?.end).toEqual(d(2026, 5, 25)); // eksklusiv
    expect(before?.description).toContain('24. mai 2026');
  });

  test('Før barnehagestart vises ikke uten barnehage eller uten gap', () => {
    const noDaycare = options('both', 'mother', 'ferie', { daycareStart: null });
    expect(noDaycare.map((o) => o.id)).not.toContain('before-daycare');

    // Barnehagestart samme dag som fars permisjon slutter: ingen gap
    const leaveResult = calculateLeave(DUE, 100, 'both', 8, 0, d(2027, 5, 3));
    const noGap = getPlacementOptions({
      rights: 'both',
      parent: 'mother',
      type: 'ferie',
      leaveResult,
      daycareStart: d(2027, 5, 3),
      durationDays: 14,
    });
    expect(noGap.map((o) => o.id)).not.toContain('before-daycare');
  });

  test('ulønnet permisjon har ikke «I mors permisjon», men de andre valgene', () => {
    expect(options('both', 'mother', 'ulonnet').map((o) => o.id)).toEqual([
      'before',
      'after',
      'before-daycare',
      'custom',
    ]);
  });

  test('annet har bare Etter mors permisjon og Velg datoer selv', () => {
    expect(options('both', 'mother', 'annet').map((o) => o.id)).toEqual(['after', 'custom']);
  });
});

describe('begge har rett, Far valgt', () => {
  test('ferie: før, i og etter fars permisjon, uten barnehagevalget', () => {
    expect(summarize(options('both', 'father'))).toEqual([
      {
        id: 'before',
        label: 'Før fars permisjon',
        description: 'Slutter 22. nov. 2026. Mor er hjemme da.',
        start: d(2026, 11, 9),
        end: d(2026, 11, 23),
      },
      {
        id: 'during',
        label: 'I fars permisjon',
        description: 'Fra 23. nov. 2026. Far får foreldrepenger og feriepenger samtidig.',
        start: d(2026, 11, 23),
        end: d(2026, 12, 7),
      },
      {
        id: 'after',
        label: 'Etter fars permisjon',
        description: 'Fra 3. mai 2027, etter at permisjonen er over.',
        start: d(2027, 5, 3),
        end: d(2027, 5, 17),
      },
      { id: 'custom', label: 'Velg datoer selv', description: null, start: null, end: null },
    ]);
  });

  test('har ingen valg som peker på mors permisjon', () => {
    for (const type of ['ferie', 'ulonnet', 'annet'] as const) {
      const labels = options('both', 'father', type).map((o) => o.label);
      expect(labels.some((l) => /mors/.test(l))).toBe(false);
    }
  });

  test('ulønnet og annet', () => {
    expect(options('both', 'father', 'ulonnet').map((o) => o.id)).toEqual(['before', 'after', 'custom']);
    expect(options('both', 'father', 'annet').map((o) => o.id)).toEqual(['after', 'custom']);
  });

  test('fars permisjon er uendret: valgene leser bare datoene', () => {
    const leaveResult = calculateLeave(DUE, 100, 'both', 8, 0, DAYCARE);
    const before = { start: leaveResult.father.start.getTime(), end: leaveResult.father.end.getTime() };
    getPlacementOptions({
      rights: 'both',
      parent: 'father',
      type: 'ferie',
      leaveResult,
      daycareStart: DAYCARE,
      durationDays: 14,
    });
    expect({ start: leaveResult.father.start.getTime(), end: leaveResult.father.end.getTime() }).toEqual(before);
  });
});

describe('kun mor', () => {
  test('ferie: før, i og etter permisjonen (UC-2)', () => {
    expect(summarize(options('mother-only', 'mother'))).toEqual([
      {
        id: 'before',
        label: 'Før permisjonen',
        description: 'Slutter 24. mai 2026, dagen før permisjonen starter.',
        start: d(2026, 5, 11),
        end: d(2026, 5, 25),
      },
      {
        id: 'during',
        label: 'I permisjonen',
        description: 'Fra uke 7 etter fødselen. Mor får foreldrepenger og feriepenger samtidig.',
        start: d(2026, 7, 27),
        end: d(2026, 8, 10),
      },
      {
        id: 'after',
        label: 'Etter permisjonen',
        description: 'Fra 3. mai 2027, etter at permisjonen er over.',
        start: d(2027, 5, 3),
        end: d(2027, 5, 17),
      },
      { id: 'custom', label: 'Velg datoer selv', description: null, start: null, end: null },
    ]);
  });

  test('far har ikke permisjon, så bare Velg datoer selv', () => {
    expect(options('mother-only', 'father').map((o) => o.id)).toEqual(['custom']);
  });
});

describe('kun far', () => {
  test('ferie: før, i og etter permisjonen uten å flytte den (UC-20)', () => {
    expect(summarize(options('father-only', 'father'))).toEqual([
      {
        id: 'before',
        label: 'Før permisjonen',
        description: 'Slutter 14. juni 2026, dagen før permisjonen starter.',
        start: d(2026, 6, 1),
        end: d(2026, 6, 15),
      },
      {
        id: 'during',
        label: 'I permisjonen',
        description: 'Fra 15. juni 2026. Far får foreldrepenger og feriepenger samtidig.',
        start: d(2026, 6, 15),
        end: d(2026, 6, 29),
      },
      {
        id: 'after',
        label: 'Etter permisjonen',
        description: 'Fra 22. mars 2027, etter at permisjonen er over.',
        start: d(2027, 3, 22),
        end: d(2027, 4, 5),
      },
      { id: 'custom', label: 'Velg datoer selv', description: null, start: null, end: null },
    ]);
  });

  test('mor har ikke permisjon, så bare Velg datoer selv', () => {
    expect(options('father-only', 'mother').map((o) => o.id)).toEqual(['custom']);
  });

  test('datoene merkes som anslag', () => {
    expect(getPlacementHint('father-only', 'father')).toBe(
      'Far starter på beregnet termin i planen, så datoene er anslag.',
    );
    expect(getPlacementHint('both', 'father')).toBeNull();
    expect(getPlacementHint('mother-only', 'mother')).toBeNull();
  });
});

describe('lengden på perioden', () => {
  test('Før regner start bakover og Etter og I regner slutt framover', () => {
    const list = options('mother-only', 'mother', 'ferie', { durationDays: 7 });
    const byId = Object.fromEntries(list.map((o) => [o.id, o]));
    expect(byId.before.start).toEqual(d(2026, 5, 18));
    expect(byId.before.end).toEqual(d(2026, 5, 25));
    expect(byId.after.end).toEqual(d(2027, 5, 10));
  });

  test('uten leaveResult finnes bare Velg datoer selv', () => {
    expect(options('both', 'mother', 'ferie', { leaveResult: undefined }).map((o) => o.id)).toEqual(['custom']);
  });
});

describe('duplikater', () => {
  // Før regnet «Etter mors permisjon» og «Overlapp med fars permisjon» for Far
  // ut til samme datoer, siden fars start er mors slutt: 23. nov. 2026 + 14 dager
  const afterMother: PlacementOption = {
    id: 'after',
    label: 'Etter mors permisjon',
    description: 'Fra 23. nov. 2026.',
    start: d(2026, 11, 23),
    end: d(2026, 12, 7),
  };
  const overlapFather: PlacementOption = {
    id: 'during',
    label: 'Overlapp med fars permisjon',
    description: 'Fra 23. nov. 2026.',
    start: d(2026, 11, 23),
    end: d(2026, 12, 7),
  };
  const beforeFather: PlacementOption = {
    id: 'before',
    label: 'Før fars permisjon',
    description: 'Slutter 22. nov. 2026.',
    start: d(2026, 11, 9),
    end: d(2026, 11, 23),
  };
  const custom: PlacementOption = {
    id: 'custom',
    label: 'Velg datoer selv',
    description: null,
    start: null,
    end: null,
  };

  test('Etter mors permisjon og Overlapp med fars permisjon for Far gir ett valg', () => {
    const result = removeDuplicatePlacements([beforeFather, afterMother, overlapFather, custom]);
    expect(result.map((o) => o.label)).toEqual([
      'Før fars permisjon',
      'Etter mors permisjon',
      'Velg datoer selv',
    ]);
  });

  test('sammenligner datoene, ikke teksten', () => {
    const sameTextOtherDates = { ...overlapFather, start: d(2026, 11, 24), end: d(2026, 12, 8) };
    expect(removeDuplicatePlacements([afterMother, sameTextOtherDates])).toHaveLength(2);
    const otherTextSameDates = { ...overlapFather, label: 'Noe helt annet', description: 'Annen tekst.' };
    expect(removeDuplicatePlacements([afterMother, otherTextSameDates])).toHaveLength(1);
  });

  test('forhåndsvalget beholdes selv om et annet valg kommer først', () => {
    const result = removeDuplicatePlacements([overlapFather, afterMother]);
    expect(result.map((o) => o.id)).toEqual(['after']);
  });

  test('Velg datoer selv har ingen datoer og fjernes aldri', () => {
    expect(removeDuplicatePlacements([custom, { ...custom }])).toHaveLength(2);
  });

  test('når far har like datoer som mor får Mor bare Etter mors permisjon', () => {
    // Fars permisjon slutter samme dag som mors, f.eks. uten uker til far
    const leaveResult = calculateLeave(DUE, 100, 'both', 8, 0, DAYCARE);
    const list = getPlacementOptions({
      rights: 'both',
      parent: 'mother',
      type: 'ferie',
      leaveResult: {
        ...leaveResult,
        gap: { ...leaveResult.gap, start: leaveResult.mother.end },
      },
      daycareStart: DAYCARE,
      durationDays: 14,
    });
    expect(list.map((o) => o.id)).toEqual(['before', 'during', 'after', 'custom']);
  });
});

describe('tekster og forhåndsvalg', () => {
  test('spørsmålet følger forelder og type', () => {
    expect(getPlacementQuestion('mother', 'ferie')).toBe('Når skal mor ta ferie?');
    expect(getPlacementQuestion('father', 'ferie')).toBe('Når skal far ta ferie?');
    expect(getPlacementQuestion('father', 'ulonnet')).toBe('Når skal far ta ulønnet permisjon?');
    expect(getPlacementQuestion('mother', 'annet')).toBe('Når skal mor ha perioden?');
  });

  test('Etter permisjonen er forhåndsvalgt, ellers det første valget', () => {
    expect(getDefaultPlacementId(options('both', 'mother'))).toBe('after');
    expect(getDefaultPlacementId(options('both', 'father'))).toBe('after');
    expect(getDefaultPlacementId(options('mother-only', 'father'))).toBe('custom');
  });

  test('datoområdet skrives med «til», med inklusiv slutt', () => {
    expect(formatPlacementRange(d(2026, 11, 23), d(2026, 12, 7))).toBe('23. nov. 2026 til 6. des. 2026');
  });
});
