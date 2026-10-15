import { describe, test, expect } from 'bun:test';
import { compareScenarios, hasEconomyInput } from './economy';
import { calculateLeave, getParentLeaveWeeks, getTotalLeaveWeeks } from './dates';
import type { Coverage, GapInfo, ParentEconomy, ParentRights } from '../types';

/**
 * Økonomi per rettighet (kun mor, kun far, begge).
 *
 * Forventede tall er regnet for hånd ut fra NAV-reglene og konstantene, ikke hentet fra
 * funksjonene som testes. Felles forutsetninger: G = 136 549 (6G = 819 294), månedslønn
 * 50 000 (årslønn 600 000, under 6G), ingen provisjon, arbeidsgiver betaler ikke
 * feriepenger, 21,7 arbeidsdager per måned.
 *
 *   ukesgrunnlag            = 600 000 / 52           = 11 538,46
 *   feriepenger per uke     = 600 000 * 0,102 / 52   = 1 176,92
 *   dagsats                 = 50 000 / 21,7          = 2 304,15
 *
 * Uker fra LEAVE_CONFIG: kun far 40 (100%) / 52 (80%), kun mor 49 / 61.
 * NAV oppgir 52 uker og 1 dag for kun far ved 80% og 61 uker og 1 dag for mor ved 80%.
 * Konstantene er avrundet til hele uker, så 80%-tallene her er ikke regnet ut fra NAVs
 * eksakte dag-tall, men fra avrundingen i LEAVE_CONFIG (én dags forskjell, ca. 1 850 kr).
 */

function economy(overrides: Partial<ParentEconomy> = {}): ParentEconomy {
  return {
    monthlySalary: 50_000,
    monthlyCommissionLoss: 0,
    employerCoversAbove6G: false,
    employerPaysFeriepenger: false,
    ...overrides,
  };
}

const NO_ECONOMY = economy({ monthlySalary: 0 });

/** Gap fra og med start til (eksklusiv) slutt. Arbeidsdager regnes av funksjonene selv. */
function gap(start: Date, end: Date): GapInfo {
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return { start, end, weeks: Math.ceil(days / 7), days, workDays: 0 };
}

const NO_GAP = gap(new Date(2027, 9, 1), new Date(2027, 9, 1));

describe('getTotalLeaveWeeks / getParentLeaveWeeks', () => {
  test('totalt antall uker per rettighet og dekningsgrad', () => {
    expect(getTotalLeaveWeeks(100, 'both')).toBe(49);
    expect(getTotalLeaveWeeks(80, 'both')).toBe(61);
    expect(getTotalLeaveWeeks(100, 'mother-only')).toBe(49);
    expect(getTotalLeaveWeeks(80, 'mother-only')).toBe(61);
    expect(getTotalLeaveWeeks(100, 'father-only')).toBe(40);
    expect(getTotalLeaveWeeks(80, 'father-only')).toBe(52);
  });

  test('uker per forelder: kun far får alt, kun mor får alt', () => {
    expect(getParentLeaveWeeks(100, 'father-only', 8)).toEqual({ mother: 0, father: 40 });
    expect(getParentLeaveWeeks(80, 'father-only', 10)).toEqual({ mother: 0, father: 52 });
    expect(getParentLeaveWeeks(100, 'mother-only', 8)).toEqual({ mother: 49, father: 0 });
    expect(getParentLeaveWeeks(80, 'mother-only', 10)).toEqual({ mother: 61, father: 0 });
  });

  test('uker per forelder for begge: 3 før termin + mødrekvote + felles til mor', () => {
    // 100%: mor 3 + 15 + 8 = 26, far 15 + (16 - 8) = 23
    expect(getParentLeaveWeeks(100, 'both', 8)).toEqual({ mother: 26, father: 23 });
    // 80%: mor 3 + 19 + 10 = 32, far 19 + (20 - 10) = 29
    expect(getParentLeaveWeeks(80, 'both', 10)).toEqual({ mother: 32, father: 29 });
  });

  test('stemmer med ukene calculateLeave faktisk planlegger', () => {
    const dueDate = new Date(2026, 9, 15);
    const daycare = new Date(2028, 7, 1);
    const cases: [Coverage, ParentRights, number][] = [
      [100, 'both', 8],
      [80, 'both', 10],
      [100, 'mother-only', 8],
      [80, 'mother-only', 10],
      [100, 'father-only', 8],
      [80, 'father-only', 10],
    ];
    for (const [coverage, rights, shared] of cases) {
      const leave = calculateLeave(dueDate, coverage, rights, shared, 0, daycare);
      const weeks = getParentLeaveWeeks(coverage, rights, shared);
      expect(weeks.mother).toBe(leave.mother.weeks);
      expect(weeks.father).toBe(leave.father.weeks);
    }
  });
});

describe('hasEconomyInput', () => {
  const salary = economy();
  test('kun far krever fars lønn, ikke mors', () => {
    expect(hasEconomyInput('father-only', NO_ECONOMY, salary)).toBe(true);
    expect(hasEconomyInput('father-only', salary, NO_ECONOMY)).toBe(false);
  });
  test('kun mor krever mors lønn, ikke fars', () => {
    expect(hasEconomyInput('mother-only', salary, NO_ECONOMY)).toBe(true);
    expect(hasEconomyInput('mother-only', NO_ECONOMY, salary)).toBe(false);
  });
  test('begge: lønn for minst én av foreldrene', () => {
    expect(hasEconomyInput('both', salary, NO_ECONOMY)).toBe(true);
    expect(hasEconomyInput('both', NO_ECONOMY, salary)).toBe(true);
    expect(hasEconomyInput('both', NO_ECONOMY, NO_ECONOMY)).toBe(false);
  });
  test('manglende økonomi gir false', () => {
    expect(hasEconomyInput('father-only', undefined, undefined)).toBe(false);
    expect(hasEconomyInput('mother-only', undefined, undefined)).toBe(false);
  });
});

describe('compareScenarios: kun far', () => {
  // Termin 15. okt 2026, far starter på termin. 100%: 40 uker gir permisjonsslutt torsdag
  // 22. juli 2027, barnehagestart 1. okt 2027. 71 kalenderdager, torsdag til torsdag:
  // 10 hele uker (50 hverdager) + torsdag 30. sep = 51 arbeidsdager.
  // 80%: 52 uker gir slutt 14. okt 2027, ingen gap.
  const gap100 = gap(new Date(2027, 6, 22), new Date(2027, 9, 1));

  test('100%: 40 uker, gapet tas av far, feriepenger etter 12 uker', () => {
    const result = compareScenarios(NO_ECONOMY, economy(), 8, NO_GAP, gap100, 'father-only');
    // NAV: 40 * 11 538,46 = 461 538,46
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(461_538.46, 1);
    // Gap: 51 * 2 304,15 = 117 511,52
    expect(result.scenario100.breakdown.gapCost).toBeCloseTo(117_511.52, 1);
    expect(result.scenario100.breakdown.gapTakenBy).toBe('father');
    // Feriepenger: (40 - 12) * 1 176,92 = 32 953,85
    expect(result.scenario100.breakdown.feriepengeDifference).toBeCloseTo(32_953.85, 1);
    // 461 538,46 - 117 511,52 - 32 953,85 = 311 073,09
    expect(result.scenario100.total).toBeCloseTo(311_073.09, 1);
  });

  test('80%: 52 uker, ingen gap, feriepenger etter 15 uker', () => {
    const result = compareScenarios(NO_ECONOMY, economy(), 8, NO_GAP, gap100, 'father-only');
    // NAV: 52 * 11 538,46 * 0,8 = 480 000
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(480_000, 1);
    expect(result.scenario80.breakdown.gapCost).toBe(0);
    // Feriepenger: (52 - 15) * 1 176,92 = 43 546,15
    expect(result.scenario80.breakdown.feriepengeDifference).toBeCloseTo(43_546.15, 1);
    // 480 000 - 43 546,15 = 436 453,85
    expect(result.scenario80.total).toBeCloseTo(436_453.85, 1);
    // Forskjell 100% - 80% = 311 073,09 - 436 453,85
    expect(result.difference).toBeCloseTo(-125_380.76, 1);
  });

  test('mors gamle lønn fra «begge» påvirker ikke kun far', () => {
    const stale = economy({ monthlySalary: 80_000, monthlyCommissionLoss: 5_000 });
    const withStale = compareScenarios(stale, economy(), 8, NO_GAP, gap100, 'father-only');
    const clean = compareScenarios(NO_ECONOMY, economy(), 8, NO_GAP, gap100, 'father-only');
    expect(withStale.scenario100).toEqual(clean.scenario100);
    expect(withStale.scenario80).toEqual(clean.scenario80);
    expect(withStale.scenario100.breakdown.gapTakenBy).toBe('father');
  });

  test('lønn over 6G kappes: 819 294 / 52 * 40 = 630 226,15', () => {
    const result = compareScenarios(
      NO_ECONOMY,
      economy({ monthlySalary: 100_000 }),
      8,
      NO_GAP,
      NO_GAP,
      'father-only',
    );
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(630_226.15, 1);
  });

  test('provisjonstap følger fars uker: 40 uker / 4,33 * 10 000', () => {
    const result = compareScenarios(
      NO_ECONOMY,
      economy({ monthlyCommissionLoss: 10_000 }),
      8,
      NO_GAP,
      NO_GAP,
      'father-only',
    );
    expect(result.scenario100.breakdown.commissionLoss).toBeCloseTo((40 / 4.33) * 10_000, 4);
    expect(result.scenario80.breakdown.commissionLoss).toBeCloseTo((52 / 4.33) * 10_000, 4);
  });
});

describe('anbefalingstekst: retning følger hvem som lønner seg', () => {
  const gap100 = gap(new Date(2027, 6, 22), new Date(2027, 9, 1));

  test('kun far, 80% lønner seg: teksten snakker om 80% og 12 ekstra uker', () => {
    const result = compareScenarios(NO_ECONOMY, economy(), 8, NO_GAP, gap100, 'father-only');
    expect(result.difference).toBeLessThan(-10_000);
    expect(result.recommendation).toContain('80%-permisjonen 12 uker ekstra');
    expect(result.recommendation).toContain('kortere udekket gap');
    expect(result.recommendation).not.toContain('100% gir høyere');
  });

  test('100% lønner seg: teksten snakker om 100% og høyere utbetaling', () => {
    // 80% får et langt gap (2. aug - 27. sep = 40 arbeidsdager), 100% har ingen gap
    const result = compareScenarios(
      economy(),
      undefined,
      8,
      gap(new Date(2027, 7, 2), new Date(2027, 8, 27)),
      NO_GAP,
      'mother-only',
    );
    expect(result.difference).toBeGreaterThan(10_000);
    expect(result.recommendation).toContain('100% gir høyere utbetaling');
    expect(result.recommendation).toContain('kortere udekket gap');
  });
});

describe('compareScenarios: kun mor', () => {
  // 100%: én uke gap, mandag 2. aug til mandag 9. aug 2027 = 5 arbeidsdager = 11 520,74.
  const gap100 = gap(new Date(2027, 7, 2), new Date(2027, 7, 9));

  test('100%: 49 uker til mor, 37 uker uten feriepenger', () => {
    const result = compareScenarios(economy(), undefined, 8, NO_GAP, gap100, 'mother-only');
    // 49 * 11 538,46 = 565 384,62
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(565_384.62, 1);
    expect(result.scenario100.breakdown.gapCost).toBeCloseTo(11_520.74, 1);
    expect(result.scenario100.breakdown.gapTakenBy).toBe('mother');
    // (49 - 12) * 1 176,92 = 43 546,15
    expect(result.scenario100.breakdown.feriepengeDifference).toBeCloseTo(43_546.15, 1);
    // 565 384,62 - 11 520,74 - 43 546,15 = 510 317,73
    expect(result.scenario100.total).toBeCloseTo(510_317.73, 1);
  });

  test('80%: 61 uker til mor, 46 uker uten feriepenger', () => {
    const result = compareScenarios(economy(), undefined, 8, NO_GAP, gap100, 'mother-only');
    // 61 * 11 538,46 * 0,8 = 563 076,92
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(563_076.92, 1);
    // (61 - 15) * 1 176,92 = 54 138,46
    expect(result.scenario80.breakdown.feriepengeDifference).toBeCloseTo(54_138.46, 1);
    // 563 076,92 - 54 138,46 = 508 938,46
    expect(result.scenario80.total).toBeCloseTo(508_938.46, 1);
    expect(result.difference).toBeCloseTo(510_317.73 - 508_938.46, 1);
  });

  test('fars gamle lønn fra «begge» påvirker ikke kun mor', () => {
    const stale = economy({ monthlySalary: 20_000 });
    const withStale = compareScenarios(economy(), stale, 8, NO_GAP, gap100, 'mother-only');
    const clean = compareScenarios(economy(), undefined, 8, NO_GAP, gap100, 'mother-only');
    expect(withStale.scenario100).toEqual(clean.scenario100);
    expect(withStale.scenario80).toEqual(clean.scenario80);
    expect(withStale.scenario100.breakdown.gapTakenBy).toBe('mother');
  });
});

describe('compareScenarios: begge (uendret)', () => {
  test('uker for begge følger fortsatt 80%-fordelingen og skalerer felles til 100%', () => {
    // Fellesuker til mor = 9 (80%-enhet). 80%: mor 3 + 19 + 9 = 31, far 19 + 11 = 30.
    // 100%: round(16 * 9 / 20) = 7, mor 3 + 15 + 7 = 25, far 15 + 9 = 24.
    const result = compareScenarios(economy(), economy(), 9, NO_GAP, NO_GAP, 'both');
    // NAV 100%: (25 + 24) * 11 538,46 = 565 384,62. NAV 80%: (31 + 30) * 11 538,46 * 0,8.
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(565_384.62, 1);
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(563_076.92, 1);
  });
});
