/**
 * Månedlig inntekt ut fra periodene i planleggeren (kalenderen).
 *
 * Brukes av månedsoversikten. Økonomisammenligningen i economy.ts regner på
 * permisjonen fra veiviseren og ser ikke periodene brukeren legger inn selv.
 */

import { addDays, addMonths, getDaysInMonth, isAfter, startOfDay, startOfMonth, subDays } from 'date-fns';
import type { Coverage, CustomPeriod, Parent, ParentEconomy, ParentRights } from '../types';
import { calculateBasis, monthlyNavPayout } from './economy';

export interface PlannerIncomeInput {
  periods: CustomPeriod[];
  rights: ParentRights;
  coverage: Coverage;
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  /** Gapet mellom permisjonsslutt og barnehagestart (eksklusiv slutt) */
  gap: { start: Date; end: Date };
  /** Barnehagestart når den er slått på, ellers null */
  daycareStartDate: Date | null;
}

export interface PlannerMonthIncome {
  month: Date;
  navIncome: number;
  employerIncome: number;
  total: number;
  /** Ligger noen ferie, for en av foreldrene, i måneden? */
  hasVacation: boolean;
}

const NO_INCOME = { navIncome: 0, employerIncome: 0, total: 0 };

type ParentMonthIncome = typeof NO_INCOME;

/**
 * Hvem er hjemme i gapet: den med lavest lønn, samme regel som calculateGapCost.
 */
function getPlannerGapParent(
  rights: ParentRights,
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy,
): Parent {
  if (rights === 'mother-only') return 'mother';
  if (rights === 'father-only') return 'father';
  return motherEconomy.monthlySalary <= fatherEconomy.monthlySalary ? 'mother' : 'father';
}

/** Vanlig månedslønn for familien når ingen er i permisjon */
export function getPlannerNormalIncome(
  rights: ParentRights,
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy,
): number {
  return (
    (rights !== 'father-only' ? motherEconomy.monthlySalary : 0) +
    (rights !== 'mother-only' ? fatherEconomy.monthlySalary : 0)
  );
}

/** Er dagen innenfor perioden? Sammenligner kalenderdager, uten klokkeslett. */
function coversDay(period: CustomPeriod, day: Date): boolean {
  return day >= startOfDay(period.startDate) && day < startOfDay(period.endDate);
}

/** De seks ukene etter fødsel som mor må ta selv, og som ikke kan kombineres med ferie */
function isMandatoryLeave(period: CustomPeriod): boolean {
  return period.type === 'permisjon' && period.segmentType === 'mandatory';
}

type DayIncome = { nav: boolean; employer: boolean };

/**
 * Hva får forelderen en gitt dag? Alle periodene som dekker dagen teller,
 * så rekkefølgen på periodene spiller ingen rolle:
 *   - permisjon: foreldrepenger. Ulønnet eller annet samtidig endrer ikke det.
 *   - ferie: feriepenger fra arbeidsgiver, også når den ligger over egen
 *     permisjon (da løper foreldrepengene i tillegg). Unntaket er de seks
 *     obligatoriske ukene etter fødsel, som ikke kan kombineres med ferie.
 *   - ulønnet eller annet uten permisjon og ferie: ingenting.
 *   - ingen periode: lønn, eller ingenting i gapet for den som er hjemme.
 * Feriepenger regnes som lønn for dagen (forenkling, se docs/nav/foreldrepenger.md).
 */
function classifyDay(day: Date, parentPeriods: CustomPeriod[], inUnpaidGap: boolean): DayIncome {
  const covering = parentPeriods.filter((p) => coversDay(p, day));
  if (covering.length === 0) return { nav: false, employer: !inUnpaidGap };

  const nav = covering.some((p) => p.type === 'permisjon');
  const vacation = covering.some((p) => p.type === 'ferie');
  const mandatory = covering.some(isMandatoryLeave);
  return { nav, employer: vacation && !mandatory };
}

function calcParentMonth(
  monthStart: Date,
  parent: Parent,
  periods: CustomPeriod[],
  economy: ParentEconomy,
  coverage: Coverage,
  gap: { start: Date; end: Date },
  isGapParent: boolean,
): ParentMonthIncome {
  if (economy.monthlySalary <= 0) return NO_INCOME;

  const daysInMonth = getDaysInMonth(monthStart);
  const monthlyNav = monthlyNavPayout(calculateBasis(economy.monthlySalary, economy.employerCoversAbove6G), coverage);
  const gapStart = startOfDay(gap.start);
  const gapEnd = startOfDay(gap.end);
  const parentPeriods = periods.filter((p) => p.parent === parent);

  let navDays = 0;
  let employerDays = 0;

  for (let d = 0; d < daysInMonth; d++) {
    const day = addDays(monthStart, d);
    const inUnpaidGap = isGapParent && day >= gapStart && day < gapEnd;
    const income = classifyDay(day, parentPeriods, inUnpaidGap);
    if (income.nav) navDays++;
    if (income.employer) employerDays++;
  }

  const navIncome = Math.round((navDays / daysInMonth) * monthlyNav);
  const employerIncome = Math.round((employerDays / daysInMonth) * economy.monthlySalary);
  return { navIncome, employerIncome, total: navIncome + employerIncome };
}

/**
 * Inntekt per kalendermåned fra første periode til barnehagestart (eller
 * siste periode hvis den slutter senere).
 */
export function calculatePlannerMonthlyIncome(input: PlannerIncomeInput): PlannerMonthIncome[] {
  const { periods, rights, coverage, motherEconomy, fatherEconomy, gap, daycareStartDate } = input;
  if (periods.length === 0) return [];

  const firstStart = new Date(Math.min(...periods.map((p) => p.startDate.getTime())));
  // Sluttdatoen er eksklusiv, så siste dag er dagen før
  const lastDay = subDays(new Date(Math.max(...periods.map((p) => p.endDate.getTime()))), 1);
  const rangeStart = startOfMonth(firstStart);
  const rangeEnd = daycareStartDate && daycareStartDate > lastDay
    ? startOfMonth(daycareStartDate)
    : startOfMonth(lastDay);

  const gapParent = getPlannerGapParent(rights, motherEconomy, fatherEconomy);
  const months: PlannerMonthIncome[] = [];

  for (let month = rangeStart; !isAfter(month, rangeEnd); month = addMonths(month, 1)) {
    const mother = rights !== 'father-only'
      ? calcParentMonth(month, 'mother', periods, motherEconomy, coverage, gap, gapParent === 'mother')
      : NO_INCOME;
    const father = rights !== 'mother-only'
      ? calcParentMonth(month, 'father', periods, fatherEconomy, coverage, gap, gapParent === 'father')
      : NO_INCOME;

    const monthEnd = addMonths(month, 1);
    months.push({
      month,
      hasVacation: periods.some((p) => p.type === 'ferie' && p.startDate < monthEnd && p.endDate > month),
      navIncome: mother.navIncome + father.navIncome,
      employerIncome: mother.employerIncome + father.employerIncome,
      total: mother.total + father.total,
    });
  }

  return months;
}

export type VacationLeaveOverlap = 'none' | 'leave' | 'mandatory';

/**
 * Overlapper en ferie [start, end) forelderens egen permisjon?
 * 'mandatory' når den treffer de seks obligatoriske ukene, som ikke kan
 * kombineres med ferie. Brukes til varselet i periodedialogen; `excludeId`
 * er perioden som redigeres, så den ikke overlapper seg selv.
 */
export function getVacationLeaveOverlap(
  periods: CustomPeriod[],
  parent: Parent,
  start: Date,
  end: Date,
  excludeId?: string,
): VacationLeaveOverlap {
  const from = startOfDay(start);
  const to = startOfDay(end);
  const overlapping = periods.filter(
    (p) =>
      p.id !== excludeId &&
      p.parent === parent &&
      p.type === 'permisjon' &&
      startOfDay(p.startDate) < to &&
      startOfDay(p.endDate) > from,
  );
  if (overlapping.some(isMandatoryLeave)) return 'mandatory';
  return overlapping.length > 0 ? 'leave' : 'none';
}
