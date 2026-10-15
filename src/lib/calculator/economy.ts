/**
 * Økonomiberegninger for foreldrepermisjon
 */

import {
  MAX_BASIS,
  COVERAGE_RATE,
  WORK_DAYS_PER_MONTH,
  FERIEPENGER_NAV_WEEKS,
  FERIEPENGER_RATE,
} from '../constants';
import type {
  Coverage,
  Parent,
  ParentEconomy,
  ParentRights,
  ScenarioResult,
  EconomyComparisonInput,
  EconomyResult,
  GapInfo,
  LeaveResult,
  LeaveSegment,
  TimeSeriesPoint,
} from '../types';
import { calculateLeave, countWorkdaysInRange, getParentLeaveWeeks } from './dates';
import { convertSharedWeeksToMother } from './leave-inputs';

// Brukes når en forelder uten rett i planen ikke har oppgitt økonomi
export const NO_ECONOMY: ParentEconomy = {
  monthlySalary: 0,
  monthlyCommissionLoss: 0,
  employerCoversAbove6G: false,
  employerPaysFeriepenger: false,
};

/**
 * Har brukeren oppgitt nok økonomi til at sammenligningen gir mening for rettighetene?
 * Kun mor trenger mors lønn, kun far trenger fars lønn. Når begge har rett
 * holder det at én av dem har oppgitt lønn (samme krav som oppsummeringen og
 * månedsoversikten alltid har brukt).
 */
export function hasEconomyInput(
  rights: ParentRights,
  motherEconomy: ParentEconomy | undefined,
  fatherEconomy: ParentEconomy | undefined,
): boolean {
  const motherHasSalary = (motherEconomy?.monthlySalary ?? 0) > 0;
  const fatherHasSalary = (fatherEconomy?.monthlySalary ?? 0) > 0;

  if (rights === 'mother-only') return motherHasSalary;
  if (rights === 'father-only') return fatherHasSalary;
  return motherHasSalary || fatherHasSalary;
}

/**
 * Teller arbeidsdager (man-fre, uten helligdager) mellom to datoer.
 * Brukes for å beregne reelt inntektstap i et gap. Bruker samme telling som
 * gap.workDays, slik at gap-kostnaden, banneret og oppsummeringen er enige.
 */
export function countWorkingDaysInGap(start: Date, end: Date): number {
  return countWorkdaysInRange(start, end);
}

/**
 * Månedlig NAV-utbetaling ut fra grunnlag og dekningsgrad
 */
export function monthlyNavPayout(basis: number, coverage: Coverage): number {
  return (basis * COVERAGE_RATE[coverage]) / 12;
}

/**
 * Beregner grunnlaget for NAV-utbetaling
 * Begrenset til 6G med mindre arbeidsgiver dekker over 6G
 */
export function calculateBasis(
  monthlySalary: number,
  employerCoversAbove6G: boolean
): number {
  const annualSalary = monthlySalary * 12;
  if (employerCoversAbove6G) {
    return annualSalary;
  }

  return Math.min(annualSalary, MAX_BASIS);
}

/**
 * Beregner dagsats for en forelder
 */
export function calculateDailyRate(monthlySalary: number): number {
  return monthlySalary / WORK_DAYS_PER_MONTH;
}

/**
 * Beregner NAV-utbetaling for en periode
 */
export function calculateNavPayout(
  basis: number,
  weeks: number,
  coverageRate: number
): number {
  const weeklyRate = basis / 52;
  return weeklyRate * weeks * coverageRate;
}

/**
 * Beregner provisjonstap over permisjonsperioden
 */
export function calculateCommissionLoss(
  monthlyCommissionLoss: number,
  weeks: number
): number {
  const monthsInLeave = weeks / 4.33; // Gjennomsnitt uker per måned
  return monthlyCommissionLoss * monthsInLeave;
}

/**
 * Beregner kostnad ved gap (ulønnet permisjon)
 * Bruker dagsats til den som tar gapet
 */
export function calculateGapCost(
  motherDailyRate: number,
  fatherDailyRate: number,
  gapDays: number
): { cost: number; takenBy: Parent | null } {
  if (gapDays <= 0) {
    return { cost: 0, takenBy: null };
  }

  // Anbefaling: Forelder med lavest dagsats tar gapet
  if (motherDailyRate <= fatherDailyRate) {
    return {
      cost: motherDailyRate * gapDays,
      takenBy: 'mother',
    };
  }

  return {
    cost: fatherDailyRate * gapDays,
    takenBy: 'father',
  };
}

/**
 * Beregner feriepenge-differanse mellom NAV og arbeidsgiver
 *
 * Hvis arbeidsgiver betaler: Full opptjening (10.2% av årslønn)
 * Hvis NAV betaler: Kun de første 12/15 ukene gir opptjening
 */
export function calculateFeriepengeDifference(
  monthlySalary: number,
  leaveWeeks: number,
  employerPaysFeriepenger: boolean,
  coverage: Coverage,
  feriepengegrunnlag?: number,
): number {
  const annualSalary = feriepengegrunnlag ?? (monthlySalary * 12);

  if (employerPaysFeriepenger) {
    // Arbeidsgiver betaler full feriepengeopptjening
    return 0;
  }

  // NAV dekker kun de første X ukene
  const navCoveredWeeks = FERIEPENGER_NAV_WEEKS[coverage];
  const weeksWithoutCoverage = Math.max(0, leaveWeeks - navCoveredWeeks);

  // Beregn tapt feriepengeopptjening for ukene uten dekning
  const weeklyFeriepenger = (annualSalary * FERIEPENGER_RATE) / 52;
  const lostFeriepenger = weeklyFeriepenger * weeksWithoutCoverage;

  return lostFeriepenger;
}

/**
 * Beregner gap-kostnad for ett scenario og velger hvem som tar gapet.
 *
 * Kun en forelder som har permisjon i planen (uker > 0) kan ta gapet.
 * Gapet er tiden etter at permisjonen er brukt opp, og samme regel brukes
 * i månedsoversikten og likviditetsgrafen (kun mor -> mor, kun far -> far).
 * Har ingen av dem uker, faller vi tilbake på alle med oppgitt økonomi.
 * Gap teller kun arbeidsdager (man-fre uten helligdager), ikke helgedager.
 */
export function calculateScenarioGapCost(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  motherWeeks: number,
  fatherWeeks: number,
  gap: GapInfo
): { cost: number; takenBy: Parent | null } {
  const anyoneOnLeave = motherWeeks > 0 || (!!fatherEconomy && fatherWeeks > 0);
  const motherCanTake = !anyoneOnLeave || motherWeeks > 0;
  const fatherCanTake = !!fatherEconomy && (!anyoneOnLeave || fatherWeeks > 0);

  const motherDailyRate = motherCanTake
    ? calculateDailyRate(motherEconomy.monthlySalary)
    : Infinity;
  const fatherDailyRate = fatherCanTake
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;

  return calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    countWorkingDaysInGap(gap.start, gap.end)
  );
}

/**
 * Beregner totaløkonomi for 80%-scenariet
 */
export function calculate80Scenario(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  motherWeeks: number,
  fatherWeeks: number,
  gap: GapInfo
): ScenarioResult {
  const coverage: Coverage = 80;

  // Mor
  const motherBasis = calculateBasis(
    motherEconomy.monthlySalary,
    motherEconomy.employerCoversAbove6G
  );
  const motherNavPayout = calculateNavPayout(motherBasis, motherWeeks, COVERAGE_RATE[80]);
  const motherCommissionLoss = calculateCommissionLoss(
    motherEconomy.monthlyCommissionLoss,
    motherWeeks
  );
  const motherFeriepengeDiff = calculateFeriepengeDifference(
    motherEconomy.monthlySalary,
    motherWeeks,
    motherEconomy.employerPaysFeriepenger,
    coverage,
    motherEconomy.feriepengegrunnlag,
  );

  // Far (hvis relevant)
  let fatherNavPayout = 0;
  let fatherCommissionLoss = 0;
  let fatherFeriepengeDiff = 0;

  if (fatherEconomy && fatherWeeks > 0) {
    const fatherBasis = calculateBasis(
      fatherEconomy.monthlySalary,
      fatherEconomy.employerCoversAbove6G
    );
    fatherNavPayout = calculateNavPayout(fatherBasis, fatherWeeks, COVERAGE_RATE[80]);
    fatherCommissionLoss = calculateCommissionLoss(
      fatherEconomy.monthlyCommissionLoss,
      fatherWeeks
    );
    fatherFeriepengeDiff = calculateFeriepengeDifference(
      fatherEconomy.monthlySalary,
      fatherWeeks,
      fatherEconomy.employerPaysFeriepenger,
      coverage,
      fatherEconomy.feriepengegrunnlag,
    );
  }

  const { cost: gapCost, takenBy } = calculateScenarioGapCost(
    motherEconomy,
    fatherEconomy,
    motherWeeks,
    fatherWeeks,
    gap
  );

  const navPayout = motherNavPayout + fatherNavPayout;
  const commissionLoss = motherCommissionLoss + fatherCommissionLoss;
  const feriepengeDifference = motherFeriepengeDiff + fatherFeriepengeDiff;

  const total = navPayout - commissionLoss - gapCost - feriepengeDifference;

  return {
    total,
    breakdown: {
      navPayout,
      commissionLoss,
      gapCost,
      gapTakenBy: takenBy,
      feriepengeDifference,
    },
  };
}

/**
 * Beregner totaløkonomi for 100%-scenariet
 */
export function calculate100Scenario(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  motherWeeks: number,
  fatherWeeks: number,
  gap: GapInfo
): ScenarioResult {
  const coverage: Coverage = 100;

  // Mor
  const motherBasis = calculateBasis(
    motherEconomy.monthlySalary,
    motherEconomy.employerCoversAbove6G
  );
  const motherNavPayout = calculateNavPayout(motherBasis, motherWeeks, COVERAGE_RATE[100]);
  const motherCommissionLoss = calculateCommissionLoss(
    motherEconomy.monthlyCommissionLoss,
    motherWeeks
  );
  const motherFeriepengeDiff = calculateFeriepengeDifference(
    motherEconomy.monthlySalary,
    motherWeeks,
    motherEconomy.employerPaysFeriepenger,
    coverage,
    motherEconomy.feriepengegrunnlag,
  );

  // Far (hvis relevant)
  let fatherNavPayout = 0;
  let fatherCommissionLoss = 0;
  let fatherFeriepengeDiff = 0;

  if (fatherEconomy && fatherWeeks > 0) {
    const fatherBasis = calculateBasis(
      fatherEconomy.monthlySalary,
      fatherEconomy.employerCoversAbove6G
    );
    fatherNavPayout = calculateNavPayout(fatherBasis, fatherWeeks, COVERAGE_RATE[100]);
    fatherCommissionLoss = calculateCommissionLoss(
      fatherEconomy.monthlyCommissionLoss,
      fatherWeeks
    );
    fatherFeriepengeDiff = calculateFeriepengeDifference(
      fatherEconomy.monthlySalary,
      fatherWeeks,
      fatherEconomy.employerPaysFeriepenger,
      coverage,
      fatherEconomy.feriepengegrunnlag,
    );
  }

  const { cost: gapCost, takenBy } = calculateScenarioGapCost(
    motherEconomy,
    fatherEconomy,
    motherWeeks,
    fatherWeeks,
    gap
  );

  const navPayout = motherNavPayout + fatherNavPayout;
  const commissionLoss = motherCommissionLoss + fatherCommissionLoss;
  const feriepengeDifference = motherFeriepengeDiff + fatherFeriepengeDiff;

  const total = navPayout - commissionLoss - gapCost - feriepengeDifference;

  return {
    total,
    breakdown: {
      navPayout,
      commissionLoss,
      gapCost,
      gapTakenBy: takenBy,
      feriepengeDifference,
    },
  };
}

/**
 * Genererer anbefaling basert på differanse og hva som faktisk bidrar
 */
function generateRecommendation(
  difference: number,
  scenario80: ScenarioResult,
  scenario100: ScenarioResult,
  extraWeeks80: number,
): string {
  if (Math.abs(difference) <= 10000) {
    return 'Forskjellen er liten. Vurder hva som passer best for familiens situasjon.';
  }

  // Build explanation based on what actually contributes
  const reasons: string[] = [];
  const navDiff = scenario100.breakdown.navPayout - scenario80.breakdown.navPayout;
  const gapDiff = scenario100.breakdown.gapCost - scenario80.breakdown.gapCost;
  const commissionDiff = scenario100.breakdown.commissionLoss - scenario80.breakdown.commissionLoss;
  const feriepengeDiff = scenario100.breakdown.feriepengeDifference - scenario80.breakdown.feriepengeDifference;

  // difference = total100 - total80: positiv betyr at 100% lønner seg
  if (difference > 0) {
    if (navDiff > 0) reasons.push('høyere NAV-utbetaling');
    if (gapDiff < 0) reasons.push('kortere udekket gap');
    if (commissionDiff < 0) reasons.push('mindre provisjonstap');
    if (feriepengeDiff < 0) reasons.push('mindre tapt feriepengeopptjening');
    const reason = reasons.length > 0 ? ` Hovedårsak: ${reasons.join(' og ')}.` : '';
    return `100% gir høyere utbetaling per uke, og gapet er håndterbart i dette tilfellet.${reason}`;
  }

  if (gapDiff > 0) reasons.push('kortere udekket gap');
  if (navDiff < 0) reasons.push('høyere samlet NAV-utbetaling');
  if (commissionDiff > 0) reasons.push('mindre provisjonstap');
  if (feriepengeDiff > 0) reasons.push('mindre tapt feriepengeopptjening');
  const reason = reasons.length > 0 ? ` Hovedårsak: ${reasons.join(' og ')}.` : '';
  return `Selv med lavere NAV-sats gir 80%-permisjonen ${extraWeeks80} uker ekstra, som gir kortere gap.${reason}`;
}

/**
 * Bygger permisjonen for begge dekningsgrader fra samme input som kalenderen.
 * Valgt dekningsgrad bruker fellesukene slik de er lagret; den andre får dem
 * omregnet med samme regel som når brukeren bytter dekningsgrad.
 */
export function buildScenarioLeaves(input: EconomyComparisonInput): {
  leave80: LeaveResult;
  leave100: LeaveResult;
  sharedWeeksToMother80: number;
  sharedWeeksToMother100: number;
} {
  const { dueDate, coverage, rights, sharedWeeksToMother, daycareStartDate, prematureWeeks = 0 } = input;
  const sharedWeeksToMother80 = convertSharedWeeksToMother(sharedWeeksToMother, coverage, 80);
  const sharedWeeksToMother100 = convertSharedWeeksToMother(sharedWeeksToMother, coverage, 100);

  return {
    leave80: calculateLeave(dueDate, 80, rights, sharedWeeksToMother80, 0, daycareStartDate, [], undefined, prematureWeeks),
    leave100: calculateLeave(dueDate, 100, rights, sharedWeeksToMother100, 0, daycareStartDate, [], undefined, prematureWeeks),
    sharedWeeksToMother80,
    sharedWeeksToMother100,
  };
}

/**
 * Sammenligner 80% og 100% scenarioer.
 *
 * Hvor mange uker hver forelder har følger av rettighetene: kun mor har hele
 * permisjonen, kun far har fars egne uker (40/52), og når begge har rett deles
 * kvoter og fellesperiode. Økonomien til en forelder uten rett i planen teller
 * ikke med.
 */
export function compareScenarios(input: EconomyComparisonInput): EconomyResult {
  const { rights, motherEconomy, fatherEconomy } = input;
  const { leave80, leave100, sharedWeeksToMother80, sharedWeeksToMother100 } = buildScenarioLeaves(input);

  const weeks80 = getParentLeaveWeeks(80, rights, sharedWeeksToMother80);
  const weeks100 = getParentLeaveWeeks(100, rights, sharedWeeksToMother100);

  const entitledFatherEconomy = rights === 'mother-only' ? undefined : fatherEconomy;

  const scenario80 = calculate80Scenario(
    motherEconomy,
    entitledFatherEconomy,
    weeks80.mother,
    weeks80.father,
    leave80.gap
  );

  const scenario100 = calculate100Scenario(
    motherEconomy,
    entitledFatherEconomy,
    weeks100.mother,
    weeks100.father,
    leave100.gap
  );

  const difference = scenario100.total - scenario80.total;
  const extraWeeks80 =
    weeks80.mother + weeks80.father - (weeks100.mother + weeks100.father);
  const recommendation = generateRecommendation(
    difference,
    scenario80,
    scenario100,
    extraWeeks80
  );

  return {
    scenario80,
    scenario100,
    difference,
    recommendation,
  };
}

/**
 * Beregner månedlig inntekt for én forelder basert på permisjonsperioder.
 * For dager i permisjon: NAV-sats. For dager utenfor (inkl. gap): 0.
 * For dager etter gap (tilbake i jobb): full lønn.
 */
function calcMonthIncome(
  monthStart: Date,
  daysInMonth: number,
  segments: LeaveSegment[],
  parent: 'mother' | 'father',
  economy: ParentEconomy,
  coverage: Coverage,
  gapStart: Date,
  gapEnd: Date,
  isGapParent: boolean,
): number {
  if (economy.monthlySalary <= 0) return 0;

  const basis = calculateBasis(economy.monthlySalary, economy.employerCoversAbove6G);
  const monthlyNav = monthlyNavPayout(basis, coverage);
  const monthlySalary = economy.monthlySalary;

  const parentSegments = segments.filter(s => s.parent === parent);

  let navDays = 0;
  let salaryDays = 0;

  for (let d = 0; d < daysInMonth; d++) {
    const day = new Date(monthStart);
    day.setDate(day.getDate() + d);

    const inLeave = parentSegments.some(s =>
      s.type !== 'gap' && s.type !== 'vacation' && day >= s.start && day < s.end
    );
    const inVacation = parentSegments.some(s =>
      s.type === 'vacation' && day >= s.start && day < s.end
    );

    if (inLeave) {
      navDays++;
    } else if (inVacation) {
      salaryDays++;
    } else if (isGapParent && day >= gapStart && day < gapEnd) {
      // Unpaid gap
    } else {
      salaryDays++;
    }
  }

  return Math.round((navDays / daysInMonth) * monthlyNav + (salaryDays / daysInMonth) * monthlySalary);
}

/**
 * Genererer kumulativ tidsserie for 80% vs 100% scenario.
 * Brukes av likviditetsgrafen (§3.3.2).
 */
export function generateCumulativeTimeSeries(input: EconomyComparisonInput): TimeSeriesPoint[] {
  const { motherEconomy, fatherEconomy, rights, daycareStartDate } = input;
  // Samme permisjon per scenario som økonomisammenligningen bruker
  const { leave80, leave100 } = buildScenarioLeaves(input);

  // Determine gap parent (lower earner)
  const gapParent: Parent =
    rights === 'mother-only' ? 'mother' :
    rights === 'father-only' ? 'father' :
    motherEconomy.monthlySalary <= (fatherEconomy?.monthlySalary ?? 0) ? 'mother' : 'father';

  // Determine month range: from leave start to daycare start
  const leaveStart = new Date(Math.min(leave80.mother.start.getTime(), leave100.mother.start.getTime()));
  const rangeStart = new Date(leaveStart.getFullYear(), leaveStart.getMonth(), 1);

  // End at daycare start month
  const rangeEnd = new Date(daycareStartDate.getFullYear(), daycareStartDate.getMonth(), 1);

  const points: TimeSeriesPoint[] = [];
  let cumulative80 = 0;
  let cumulative100 = 0;
  let current = new Date(rangeStart);

  while (current <= rangeEnd) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate 80% scenario monthly income
    const motherIncome80 = rights !== 'father-only'
      ? calcMonthIncome(current, daysInMonth, leave80.segments, 'mother', motherEconomy, 80, leave80.gap.start, leave80.gap.end, gapParent === 'mother')
      : 0;
    const fatherIncome80 = rights !== 'mother-only' && fatherEconomy
      ? calcMonthIncome(current, daysInMonth, leave80.segments, 'father', fatherEconomy, 80, leave80.gap.start, leave80.gap.end, gapParent === 'father')
      : 0;
    const income80 = motherIncome80 + fatherIncome80;

    // Calculate 100% scenario monthly income
    const motherIncome100 = rights !== 'father-only'
      ? calcMonthIncome(current, daysInMonth, leave100.segments, 'mother', motherEconomy, 100, leave100.gap.start, leave100.gap.end, gapParent === 'mother')
      : 0;
    const fatherIncome100 = rights !== 'mother-only' && fatherEconomy
      ? calcMonthIncome(current, daysInMonth, leave100.segments, 'father', fatherEconomy, 100, leave100.gap.start, leave100.gap.end, gapParent === 'father')
      : 0;
    const income100 = motherIncome100 + fatherIncome100;

    cumulative80 += income80;
    cumulative100 += income100;

    points.push({
      month: new Date(current),
      income80,
      income100,
      cumulative80,
      cumulative100,
    });

    current = new Date(year, month + 1, 1);
  }

  return points;
}
