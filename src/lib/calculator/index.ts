/**
 * Hovedeksport for kalkulatormotoren
 */

import { calculateLeave } from './dates';
import { compareScenarios, hasEconomyInput, NO_ECONOMY } from './economy';
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
    prematureWeeks = 0,
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
    prematureWeeks,
  );

  // Hvis økonomi-data er tilgjengelig for rettighetene, beregn sammenligning
  if (hasEconomyInput(rights, motherEconomy, fatherEconomy)) {
    // Samme sammenligning som økonomi-fanen og oppsummeringen
    const economy = compareScenarios({
      dueDate,
      coverage,
      rights,
      sharedWeeksToMother,
      daycareStartDate,
      prematureWeeks,
      motherEconomy: motherEconomy ?? NO_ECONOMY,
      fatherEconomy,
    });

    return { leave, economy };
  }

  return { leave };
}

// Re-eksporter nyttige funksjoner og typer
export {
  calculateLeave,
  subtractWeeks,
  getTotalLeaveWeeks,
  countWorkdaysInRange,
} from './dates';
export { convertSharedWeeksToMother, getPrematureWeeks } from './leave-inputs';
export * from '../types';
export * from '../constants';
export * from '../holidays';
