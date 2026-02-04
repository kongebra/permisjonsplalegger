/**
 * Hovedeksport for kalkulatormotoren
 */

import { calculateLeave, calculateGap } from './dates';
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
  const augustFirstSameYear = new Date(year, 7, 1); // August = 7 (0-indexed)

  // Barnet må være ca. 1 år før barnehagestart (hovedopptak 1. august)
  // Hvis født før 1. august: første mulighet er 1. august neste år
  // Hvis født etter 1. august: første mulighet er 1. august året etter neste år
  if (dueDate >= augustFirstSameYear) {
    // F.eks. født sept 2026 → bhg start aug 2028
    return new Date(year + 2, 7, 1);
  }

  // F.eks. født juli 2026 → bhg start aug 2027
  return new Date(year + 1, 7, 1);
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
  calculateGap,
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
} from './economy';
export * from '../types';
export * from '../constants';
export * from '../holidays';
