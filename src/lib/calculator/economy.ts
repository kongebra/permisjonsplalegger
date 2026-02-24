/**
 * Økonomiberegninger for foreldrepermisjon
 */

import {
  G,
  WORK_DAYS_PER_MONTH,
  LEAVE_CONFIG,
  FERIEPENGER_NAV_WEEKS,
  FERIEPENGER_RATE,
} from '../constants';
import type {
  Coverage,
  Parent,
  ParentEconomy,
  ParentRights,
  ScenarioResult,
  EconomyResult,
  GapInfo,
  LeaveSegment,
  TimeSeriesPoint,
} from '../types';
import { calculateLeave } from './dates';

/**
 * Teller antall arbeidsdager (man–fre) mellom to datoer.
 * Brukes for å beregne reelt inntektstap i et gap – helgedager teller ikke.
 */
export function countWorkingDaysInGap(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) { // Mandag (1) til fredag (5)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
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
  const sixG = 6 * G;

  if (employerCoversAbove6G) {
    return annualSalary;
  }

  return Math.min(annualSalary, sixG);
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
  const motherNavPayout = calculateNavPayout(motherBasis, motherWeeks, 0.8);
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
    fatherNavPayout = calculateNavPayout(fatherBasis, fatherWeeks, 0.8);
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

  // Gap-kostnad: teller kun arbeidsdager (man–fre), ikke helgedager
  const motherDailyRate = calculateDailyRate(motherEconomy.monthlySalary);
  const fatherDailyRate = fatherEconomy
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;
  const gapWorkingDays = countWorkingDaysInGap(gap.start, gap.end);
  const { cost: gapCost, takenBy } = calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    gapWorkingDays
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
  const motherNavPayout = calculateNavPayout(motherBasis, motherWeeks, 1.0);
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
    fatherNavPayout = calculateNavPayout(fatherBasis, fatherWeeks, 1.0);
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

  // Gap-kostnad: teller kun arbeidsdager (man–fre), ikke helgedager
  const motherDailyRate = calculateDailyRate(motherEconomy.monthlySalary);
  const fatherDailyRate = fatherEconomy
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;
  const gapWorkingDays = countWorkingDaysInGap(gap.start, gap.end);
  const { cost: gapCost, takenBy } = calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    gapWorkingDays
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
  scenario100: ScenarioResult
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

  if (difference > 0) {
    if (gapDiff < 0) reasons.push('kortere udekket gap');
    if (commissionDiff < 0) reasons.push('kortere provisjonstap');
    if (feriepengeDiff < 0) reasons.push('bedre feriepengeopptjening');
    const reason = reasons.length > 0 ? ` Hovedårsak: ${reasons.join(' og ')}.` : '';
    return `Selv med lavere NAV-sats gir 80%-permisjonen 10 uker ekstra, som gir kortere gap.${reason}`;
  } else {
    if (navDiff > 0) reasons.push('høyere NAV-utbetaling');
    if (gapDiff > 0) reasons.push('lengre udekket gap med 80%');
    if (feriepengeDiff > 0) reasons.push('lavere feriepengeopptjening');
    const reason = reasons.length > 0 ? ` Hovedårsak: ${reasons.join(' og ')}.` : '';
    return `100% gir høyere utbetaling per uke, og gapet er håndterbart i dette tilfellet.${reason}`;
  }
}

/**
 * Sammenligner 80% og 100% scenarioer
 */
export function compareScenarios(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  sharedWeeksToMother: number,
  gap80: GapInfo,
  gap100: GapInfo
): EconomyResult {
  const config80 = LEAVE_CONFIG[80];
  const config100 = LEAVE_CONFIG[100];

  // Beregn uker per forelder for 80%
  const motherWeeks80 =
    config80.preBirth + config80.mother + sharedWeeksToMother;
  const fatherWeeks80 = config80.father + (config80.shared - sharedWeeksToMother);

  // Beregn uker per forelder for 100%
  // Juster sharedWeeksToMother proporsjonalt for 100%
  const sharedRatio = sharedWeeksToMother / config80.shared;
  const adjustedSharedToMother100 = Math.round(config100.shared * sharedRatio);
  const motherWeeks100 =
    config100.preBirth + config100.mother + adjustedSharedToMother100;
  const fatherWeeks100 =
    config100.father + (config100.shared - adjustedSharedToMother100);

  const scenario80 = calculate80Scenario(
    motherEconomy,
    fatherEconomy,
    motherWeeks80,
    fatherWeeks80,
    gap80
  );

  const scenario100 = calculate100Scenario(
    motherEconomy,
    fatherEconomy,
    motherWeeks100,
    fatherWeeks100,
    gap100
  );

  const difference = scenario100.total - scenario80.total;
  const recommendation = generateRecommendation(
    difference,
    scenario80,
    scenario100
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
  const coverageRate = coverage === 80 ? 0.8 : 1.0;
  const monthlyNav = (basis * coverageRate) / 12;
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
export function generateCumulativeTimeSeries(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  dueDate: Date,
  rights: ParentRights,
  sharedWeeksToMother: number,
  daycareStartDate: Date,
): TimeSeriesPoint[] {
  // Beregn permisjonsperioder for begge scenarioer
  const config80 = LEAVE_CONFIG[80];
  const config100 = LEAVE_CONFIG[100];

  const sharedRatio = sharedWeeksToMother / config80.shared;
  const sharedToMother100 = Math.round(config100.shared * sharedRatio);

  const leave80 = calculateLeave(dueDate, 80, rights, sharedWeeksToMother, 0, daycareStartDate);
  const leave100 = calculateLeave(dueDate, 100, rights, sharedToMother100, 0, daycareStartDate);

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
