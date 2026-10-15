/**
 * Validering av lagret plan fra localStorage.
 *
 * Det som ligger i localStorage kan være ødelagt, skrevet av en eldre eller
 * nyere versjon av appen, eller redigert for hånd. Å stole blindt på det gir
 * kræsj midt i render ("This page couldn't load") som brukeren ikke kommer seg
 * ut av uten å tømme nettleserdata. Her returnerer vi enten en plan der alle
 * felt er trygge å bruke, eller null slik at brukeren starter på nytt.
 */

import { TOTAL_WIZARD_STEPS } from '@/lib/constants';
import type {
  Coverage,
  JobSettings,
  Parent,
  ParentEconomy,
  ParentRights,
  PlannerPeriodType,
  SavedPlan,
} from '@/lib/types';

const RIGHTS: readonly ParentRights[] = ['both', 'mother-only', 'father-only'];
const PARENTS: readonly Parent[] = ['mother', 'father'];
const PERIOD_TYPES: readonly PlannerPeriodType[] = ['permisjon', 'ferie', 'ulonnet', 'annet'];
const JOB_TYPES: readonly JobSettings['jobType'][] = ['office', 'shift'];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** ISO-streng som faktisk kan parses til en gyldig dato. */
function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

/** Dekningsgrad lagres som tall, men eldre/manuelle lagringer kan ha streng. */
function parseCoverage(value: unknown): Coverage | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 80 || n === 100 ? n : null;
}

function parseJobSettings(value: unknown): JobSettings | null {
  if (!isRecord(value)) return null;
  if (!isOneOf(JOB_TYPES, value.jobType) || !isFiniteNumber(value.vacationDays)) return null;
  return { jobType: value.jobType, vacationDays: value.vacationDays };
}

function parseParentEconomy(value: unknown): ParentEconomy | null {
  if (!isRecord(value) || !isFiniteNumber(value.monthlySalary)) return null;
  return {
    monthlySalary: value.monthlySalary,
    monthlyCommissionLoss: isFiniteNumber(value.monthlyCommissionLoss)
      ? value.monthlyCommissionLoss
      : 0,
    employerCoversAbove6G: value.employerCoversAbove6G === true,
    employerPaysFeriepenger: value.employerPaysFeriepenger === true,
    ...(isFiniteNumber(value.feriepengegrunnlag)
      ? { feriepengegrunnlag: value.feriepengegrunnlag }
      : {}),
  };
}

function parsePeriod(value: unknown): SavedPlan['periods'][number] | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id === '') return null;
  if (!isOneOf(PERIOD_TYPES, value.type) || !isOneOf(PARENTS, value.parent)) return null;
  if (!isValidDateString(value.startDate) || !isValidDateString(value.endDate)) return null;
  // Sluttdatoen er eksklusiv, så en periode må ha minst én dag
  if (new Date(value.endDate).getTime() <= new Date(value.startDate).getTime()) return null;

  return {
    id: value.id,
    type: value.type,
    parent: value.parent,
    startDate: value.startDate,
    endDate: value.endDate,
    ...(typeof value.label === 'string' ? { label: value.label } : {}),
    ...(typeof value.color === 'string' ? { color: value.color } : {}),
    ...(typeof value.isFromWizard === 'boolean' ? { isFromWizard: value.isFromWizard } : {}),
    ...(typeof value.isLocked === 'boolean' ? { isLocked: value.isLocked } : {}),
    ...(typeof value.segmentType === 'string' ? { segmentType: value.segmentType } : {}),
  };
}

/**
 * Gjør om ukjent JSON til en trygg SavedPlan, eller null hvis grunnlaget
 * (termindato, rettigheter, dekningsgrad, fordeling) er ugyldig.
 * Ugyldige perioder, økonomi og jobbinnstillinger hoppes over enkeltvis, slik
 * at én dårlig verdi ikke koster brukeren hele planen.
 */
export function parseSavedPlan(raw: unknown): SavedPlan | null {
  if (!isRecord(raw) || raw.version !== 1) return null;

  const wizard = raw.wizard;
  if (!isRecord(wizard)) return null;

  const coverage = parseCoverage(wizard.coverage);
  if (
    !isValidDateString(wizard.dueDate) ||
    !isOneOf(RIGHTS, wizard.rights) ||
    coverage === null ||
    !isFiniteNumber(wizard.sharedWeeksToMother) ||
    wizard.sharedWeeksToMother < 0
  ) {
    return null;
  }

  const jobSettings = isRecord(raw.jobSettings) ? raw.jobSettings : {};
  const economy = isRecord(raw.economy)
    ? { mother: parseParentEconomy(raw.economy.mother), father: parseParentEconomy(raw.economy.father) }
    : null;

  return {
    version: 1,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '',
    wizard: {
      ...(Number.isInteger(wizard.currentStep) &&
      (wizard.currentStep as number) >= 1 &&
      (wizard.currentStep as number) <= TOTAL_WIZARD_STEPS
        ? { currentStep: wizard.currentStep as number }
        : {}),
      ...(typeof wizard.wizardCompleted === 'boolean'
        ? { wizardCompleted: wizard.wizardCompleted }
        : {}),
      dueDate: wizard.dueDate,
      rights: wizard.rights,
      coverage,
      sharedWeeksToMother: wizard.sharedWeeksToMother,
      daycareStartDate: isValidDateString(wizard.daycareStartDate) ? wizard.daycareStartDate : null,
      daycareEnabled: wizard.daycareEnabled === true,
      prematureBirthDate: isValidDateString(wizard.prematureBirthDate)
        ? wizard.prematureBirthDate
        : null,
    },
    jobSettings: {
      mother: parseJobSettings(jobSettings.mother),
      father: parseJobSettings(jobSettings.father),
    },
    // Økonomi er enten komplett for begge foreldre, eller utelatt (da brukes standardverdier)
    ...(economy && economy.mother && economy.father
      ? { economy: { mother: economy.mother, father: economy.father } }
      : {}),
    periods: Array.isArray(raw.periods)
      ? raw.periods.flatMap((p) => {
          const period = parsePeriod(p);
          return period ? [period] : [];
        })
      : [],
    autoSaveEnabled: raw.autoSaveEnabled === true,
  };
}
