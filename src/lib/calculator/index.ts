/**
 * Hovedeksport for kalkulatormotoren
 */

import { calculateLeave } from './dates';
import { compareScenarios } from './economy';
import { LEAVE_CONFIG } from '../constants';
import type {
  CalculatorInput,
  CalculatorResult,
  Coverage,
} from '../types';

/**
 * Beregner default barnehagestart (1. august)
 * Barnet må være ca. 1 år gammelt før barnehagestart (hovedopptak)
 */
export function getDefaultDaycareStart(dueDate: Date): Date {
  const year = dueDate.getFullYear();
  const month = dueDate.getMonth(); // 0-indexed: jan=0, aug=7, sep=8, nov=10, dec=11

  // Barnehageloven § 16 ledd 1: Født jan–aug → rett til plass fra 1. august (år+1)
  if (month <= 7) {
    return new Date(year + 1, 7, 1);
  }

  // Barnehageloven § 16 ledd 2: Født sep–nov → rett til plass innen utgangen av
  // fødselsmåneden (år+1). Vi bruker 1. i måneden som tidligst mulig start.
  if (month <= 10) {
    return new Date(year + 1, month, 1);
  }

  // Desember: neste august-opptak (år+2)
  return new Date(year + 2, 7, 1);
}

/**
 * Beregner default felleskvote til mor (halvparten)
 */
export function getDefaultSharedWeeksToMother(coverage: Coverage): number {
  const config = LEAVE_CONFIG[coverage];
  return Math.floor(config.shared / 2);
}

/**
 * Hovedfunksjon: Beregner permisjon og eventuelt økonomi
 */
export function calculate(input: CalculatorInput): CalculatorResult {
  const {
    dueDate,
    coverage,
    rights,
    sharedWeeksToMother,
    overlapWeeks,
    daycareStartDate,
    motherEconomy,
    fatherEconomy,
    vacationWeeks,
    vacation,
  } = input;

  // Beregn permisjonsfordeling
  const leave = calculateLeave(
    dueDate,
    coverage,
    rights,
    sharedWeeksToMother,
    overlapWeeks,
    daycareStartDate,
    vacationWeeks,
    vacation
  );

  // Hvis økonomi-data er tilgjengelig, beregn sammenligning
  if (motherEconomy) {
    // Beregn gap for begge scenarioer
    const leave80 = calculateLeave(
      dueDate,
      80,
      rights,
      Math.min(sharedWeeksToMother, LEAVE_CONFIG[80].shared),
      overlapWeeks,
      daycareStartDate,
      vacationWeeks,
      vacation
    );

    const leave100 = calculateLeave(
      dueDate,
      100,
      rights,
      Math.min(sharedWeeksToMother, LEAVE_CONFIG[100].shared),
      overlapWeeks,
      daycareStartDate,
      vacationWeeks,
      vacation
    );

    const economy = compareScenarios(
      motherEconomy,
      fatherEconomy,
      sharedWeeksToMother,
      leave80.gap,
      leave100.gap
    );

    return { leave, economy };
  }

  return { leave };
}

// Re-eksporter nyttige funksjoner og typer
export {
  calculateLeave,
  countVacationDays,
  calculateQuotaUsage,
  validatePeriods,
  buildSegmentsFromPeriods,
  calculateGapFromPeriods,
  generatePeriodId,
  addDays,
  addWeeks,
  daysBetween,
  weeksBetween,
} from './dates';
export {
  calculateBasis,
  calculateDailyRate,
  calculateNavPayout,
  compareScenarios,
  generateCumulativeTimeSeries,
} from './economy';
export * from '../types';
export * from '../constants';
export * from '../holidays';
