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
  ScenarioResult,
  EconomyResult,
  GapInfo,
} from '../types';

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
  coverage: Coverage
): number {
  const annualSalary = monthlySalary * 12;

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
    coverage
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
      coverage
    );
  }

  // Gap-kostnad (80% har lengre permisjon, ofte mindre gap)
  const motherDailyRate = calculateDailyRate(motherEconomy.monthlySalary);
  const fatherDailyRate = fatherEconomy
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;
  const { cost: gapCost, takenBy } = calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    gap.days
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
    coverage
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
      coverage
    );
  }

  // Gap-kostnad (100% har kortere permisjon, ofte større gap)
  const motherDailyRate = calculateDailyRate(motherEconomy.monthlySalary);
  const fatherDailyRate = fatherEconomy
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;
  const { cost: gapCost, takenBy } = calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    gap.days
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
  const absDiff = Math.abs(difference);
  const formatted = new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(absDiff);

  if (Math.abs(difference) <= 10000) {
    return `Forskjellen er liten (${formatted}). Vurder hva som passer best for familiens situasjon.`;
  }

  // Build explanation based on what actually contributes
  const reasons: string[] = [];
  const navDiff = scenario100.breakdown.navPayout - scenario80.breakdown.navPayout;
  const gapDiff = scenario100.breakdown.gapCost - scenario80.breakdown.gapCost;
  const commissionDiff = scenario100.breakdown.commissionLoss - scenario80.breakdown.commissionLoss;
  const feriepengeDiff = scenario100.breakdown.feriepengeDifference - scenario80.breakdown.feriepengeDifference;

  if (difference > 0) {
    if (navDiff > 0) reasons.push('høyere NAV-utbetaling');
    if (gapDiff > 0) reasons.push('lengre ulønnet periode');
    if (commissionDiff < 0) reasons.push('kortere provisjonstap');
    if (feriepengeDiff < 0) reasons.push('bedre feriepengeopptjening');
    const reason = reasons.length > 0 ? ` Dette skyldes hovedsakelig ${reasons.join(' og ')}.` : '';
    return `100% dekning gir ${formatted} mer totalt.${reason}`;
  } else {
    if (navDiff < 0) reasons.push('lengre permisjonstid');
    if (gapDiff < 0) reasons.push('kortere ulønnet periode');
    if (commissionDiff > 0) reasons.push('lengre provisjonstap');
    if (feriepengeDiff > 0) reasons.push('lavere feriepengeopptjening');
    const reason = reasons.length > 0 ? ` ${reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1)}${reasons.length > 1 ? ' og ' + reasons.slice(1).join(' og ') : ''} veier opp for lavere sats.` : '';
    return `80% dekning gir ${formatted} mer totalt.${reason}`;
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
