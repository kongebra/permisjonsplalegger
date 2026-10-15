import { describe, test, expect } from 'bun:test';
import {
  calculateBasis,
  calculateDailyRate,
  calculateNavPayout,
  monthlyNavPayout,
  calculateCommissionLoss,
  calculateGapCost,
  calculateFeriepengeDifference,
  calculate100Scenario,
  compareScenarios,
  generateCumulativeTimeSeries,
  countWorkingDaysInGap,
} from './economy';
import { countWorkdaysInRange } from './dates';
import { G, MAX_BASIS, WORK_DAYS_PER_MONTH, FERIEPENGER_RATE, FERIEPENGER_NAV_WEEKS } from '../constants';
import type { EconomyComparisonInput, ParentEconomy, ParentRights, GapInfo } from '../types';

// ============================================================
// calculateBasis — 6G cap
// ============================================================
describe('calculateBasis', () => {
  test('caps at 6G when employer does not cover above', () => {
    const monthlySalary = 100_000; // 1.2M annually, above 6G
    const result = calculateBasis(monthlySalary, false);
    expect(result).toBe(6 * G);
  });

  test('returns full salary when employer covers above 6G', () => {
    const monthlySalary = 100_000;
    const result = calculateBasis(monthlySalary, true);
    expect(result).toBe(monthlySalary * 12);
  });

  test('returns full salary when below 6G', () => {
    const monthlySalary = 50_000; // 600k annually, below 6G (819,294)
    const result = calculateBasis(monthlySalary, false);
    expect(result).toBe(monthlySalary * 12);
  });

  test('6G threshold is exactly 6 * G', () => {
    const sixG = 6 * G; // 819,294
    const monthlyAt6G = sixG / 12; // 68,274.5
    expect(calculateBasis(monthlyAt6G, false)).toBe(sixG);
    // One krone above: still capped
    expect(calculateBasis(monthlyAt6G + 1, false)).toBe(sixG);
  });
});

// ============================================================
// calculateDailyRate
// ============================================================
describe('calculateDailyRate', () => {
  test('divides monthly salary by 21.7', () => {
    const result = calculateDailyRate(50_000);
    expect(result).toBeCloseTo(50_000 / WORK_DAYS_PER_MONTH);
  });
});

// ============================================================
// calculateNavPayout
// ============================================================
describe('calculateNavPayout', () => {
  test('100% payout uses full basis', () => {
    const basis = 600_000; // annual
    const weeks = 49;
    const result = calculateNavPayout(basis, weeks, 1.0);
    const expected = (basis / 52) * weeks * 1.0;
    expect(result).toBeCloseTo(expected);
  });

  test('80% payout is 80% of basis', () => {
    const basis = 600_000;
    const weeks = 59;
    const result = calculateNavPayout(basis, weeks, 0.8);
    const expected = (basis / 52) * weeks * 0.8;
    expect(result).toBeCloseTo(expected);
  });

  test('80% with more weeks can exceed 100% payout', () => {
    const basis = 600_000;
    const payout80 = calculateNavPayout(basis, 59, 0.8);
    const payout100 = calculateNavPayout(basis, 49, 1.0);
    // 59 * 0.8 = 47.2 vs 49 * 1.0 = 49 — 100% wins on payout alone
    expect(payout100).toBeGreaterThan(payout80);
  });
});

// ============================================================
// calculateCommissionLoss
// ============================================================
describe('calculateCommissionLoss', () => {
  test('longer leave means more commission loss', () => {
    const loss80 = calculateCommissionLoss(12_000, 59);
    const loss100 = calculateCommissionLoss(12_000, 49);
    expect(loss80).toBeGreaterThan(loss100);
  });

  test('zero commission means zero loss', () => {
    expect(calculateCommissionLoss(0, 59)).toBe(0);
  });
});

// ============================================================
// countWorkingDaysInGap
// ============================================================
describe('countWorkingDaysInGap', () => {
  test('lørdag til mandag = 0 arbeidsdager', () => {
    const saturday = new Date(2026, 7, 15); // lør 15. aug 2026
    const monday = new Date(2026, 7, 17);   // man 17. aug 2026
    expect(countWorkingDaysInGap(saturday, monday)).toBe(0);
  });

  test('mandag til neste mandag (7 dager) = 5 arbeidsdager', () => {
    const monday = new Date(2026, 7, 17); // man 17. aug 2026
    const nextMonday = new Date(2026, 7, 24);
    expect(countWorkingDaysInGap(monday, nextMonday)).toBe(5);
  });

  test('mandag til fredag (4 dager) = 4 arbeidsdager', () => {
    const monday = new Date(2026, 7, 17);
    const friday = new Date(2026, 7, 21);
    expect(countWorkingDaysInGap(monday, friday)).toBe(4);
  });

  test('samme dato = 0 arbeidsdager', () => {
    const date = new Date(2026, 7, 17);
    expect(countWorkingDaysInGap(date, date)).toBe(0);
  });

  // Gapet i kalenderen, banneret og oppsummeringen (gap.workDays) teller ikke
  // helligdager. Gap-kostnaden må bruke samme tall.
  test('helligdager teller ikke: man 1. mai til man 8. mai 2028 = 4 arbeidsdager', () => {
    const labourDay = new Date(2028, 4, 1); // man 1. mai 2028 (Arbeidernes dag)
    const nextMonday = new Date(2028, 4, 8);
    expect(countWorkingDaysInGap(labourDay, nextMonday)).toBe(4);
  });

  test('gap-kostnaden bruker samme arbeidsdager som gap.workDays', () => {
    const start = new Date(2028, 4, 1);
    const end = new Date(2028, 4, 8);
    const gap: GapInfo = { start, end, weeks: 1, days: 7, workDays: countWorkdaysInRange(start, end) };
    const scenario = calculate100Scenario(makeEconomy({ monthlySalary: 50_000 }), undefined, 26, 0, gap);
    // 4 arbeidsdager x 50 000 / 21,7 = 9 216,59
    expect(gap.workDays).toBe(4);
    expect(scenario.breakdown.gapCost).toBeCloseTo(9_216.59, 2);
  });
});

// ============================================================
// calculateGapCost
// ============================================================
describe('calculateGapCost', () => {
  test('zero gap days means zero cost', () => {
    const result = calculateGapCost(2000, 3000, 0);
    expect(result.cost).toBe(0);
    expect(result.takenBy).toBeNull();
  });

  test('lower earner takes the gap', () => {
    const result = calculateGapCost(2000, 3000, 60);
    expect(result.takenBy).toBe('mother'); // 2000 < 3000
    expect(result.cost).toBe(2000 * 60);
  });

  test('father takes gap when lower earner', () => {
    const result = calculateGapCost(3000, 2000, 60);
    expect(result.takenBy).toBe('father');
    expect(result.cost).toBe(2000 * 60);
  });

  test('if equal, mother takes gap', () => {
    const result = calculateGapCost(2000, 2000, 60);
    expect(result.takenBy).toBe('mother');
  });
});

// ============================================================
// calculateFeriepengeDifference
// ============================================================
describe('calculateFeriepengeDifference', () => {
  test('employer pays: no feriepenge loss', () => {
    const result = calculateFeriepengeDifference(50_000, 49, true, 100);
    expect(result).toBe(0);
  });

  test('NAV pays 100%: loss for weeks beyond 12', () => {
    const salary = 50_000;
    const weeks = 49;
    const result = calculateFeriepengeDifference(salary, weeks, false, 100);
    const annual = salary * 12;
    const weeklyFP = (annual * FERIEPENGER_RATE) / 52;
    const uncoveredWeeks = weeks - FERIEPENGER_NAV_WEEKS[100]; // 49 - 12 = 37
    expect(result).toBeCloseTo(weeklyFP * uncoveredWeeks);
    expect(result).toBeGreaterThan(0);
  });

  test('NAV pays 80%: loss for weeks beyond 15', () => {
    const salary = 50_000;
    const weeks = 59;
    const result = calculateFeriepengeDifference(salary, weeks, false, 80);
    const uncoveredWeeks = weeks - FERIEPENGER_NAV_WEEKS[80]; // 59 - 15 = 44
    expect(uncoveredWeeks).toBe(44);
    expect(result).toBeGreaterThan(0);
  });

  test('high earner: significant feriepenge loss', () => {
    // Akseptansekrav #3: feriepenge-sjokket for høytlønnede
    const highSalary = 78_000; // Akseptansekrav-scenario
    const result = calculateFeriepengeDifference(highSalary, 49, false, 100);
    // Should be meaningful — 37 weeks without coverage at 10.2% of 936k annual
    expect(result).toBeGreaterThan(30_000);
  });
});

// ============================================================
// Scenario comparison — Acceptance criteria
// ============================================================

function makeEconomy(overrides: Partial<ParentEconomy> = {}): ParentEconomy {
  return {
    monthlySalary: 50_000,
    monthlyCommissionLoss: 0,
    employerCoversAbove6G: false,
    employerPaysFeriepenger: false,
    ...overrides,
  };
}

function makeGap(days: number): GapInfo {
  const start = new Date(2027, 4, 1);
  return {
    start,
    end: new Date(start.getTime() + days * 86400000),
    weeks: Math.ceil(days / 7),
    days,
    workDays: Math.round((days * 5) / 7),
  };
}

// Termin 14. sep 2026 (permisjonsstart 24. aug 2026), barnehagestart 1. sep 2027
const DUE_DATE = new Date(2026, 8, 14);
const DAYCARE = new Date(2027, 8, 1);

function compareBoth(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  overrides: Partial<EconomyComparisonInput> = {},
) {
  return compareScenarios({
    dueDate: DUE_DATE,
    coverage: 100,
    rights: 'both',
    sharedWeeksToMother: 8,
    daycareStartDate: DAYCARE,
    motherEconomy,
    fatherEconomy,
    ...overrides,
  });
}

describe('compareScenarios', () => {
  test('returns both scenarios with difference and recommendation', () => {
    const mother = makeEconomy({ monthlySalary: 50_000 });
    const father = makeEconomy({ monthlySalary: 40_000 });
    const result = compareBoth(mother, father);

    expect(result.scenario80).toBeDefined();
    expect(result.scenario100).toBeDefined();
    expect(typeof result.difference).toBe('number');
    expect(typeof result.recommendation).toBe('string');
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  test('small difference gives neutral recommendation', () => {
    // Nearly equal scenarios
    const mother = makeEconomy({ monthlySalary: 30_000 });
    const result = compareBoth(mother, undefined);
    if (Math.abs(result.difference) <= 10000) {
      expect(result.recommendation).toContain('familiens situasjon');
    }
  });
});

// ============================================================
// Akseptansekrav #1: Høytlønnet med provisjon
// ============================================================
describe('acceptance: high earner with commission (78k + 12k)', () => {
  const motherEconomy = makeEconomy({
    monthlySalary: 78_000,
    monthlyCommissionLoss: 12_000,
    employerCoversAbove6G: true, // employer covers fastlønn
    employerPaysFeriepenger: false,
  });
  const fatherEconomy = makeEconomy({ monthlySalary: 50_000 });

  test('longer leave (80%) means more commission loss', () => {
    const loss80 = calculateCommissionLoss(12_000, 59);
    const loss100 = calculateCommissionLoss(12_000, 49);
    expect(loss80 - loss100).toBeGreaterThan(20_000);
  });

  test('comparison shows meaningful difference', () => {
    const result = compareBoth(motherEconomy, fatherEconomy);
    // The difference should be significant (not near zero)
    expect(Math.abs(result.difference)).toBeGreaterThan(10_000);
  });
});

// ============================================================
// Akseptansekrav #2: Gap-test
// ============================================================
describe('acceptance: gap test (100% ends may, daycare aug)', () => {
  test('gap cost uses working days, not calendar days', () => {
    const mother = makeEconomy({ monthlySalary: 50_000 });
    const gap100 = makeGap(92); // ~3 months gap
    const scenario = calculate100Scenario(mother, undefined, 26, 0, gap100);
    const workingDays = countWorkingDaysInGap(gap100.start, gap100.end);
    expect(scenario.breakdown.gapCost).toBeGreaterThan(0);
    expect(scenario.breakdown.gapCost).toBeCloseTo(
      calculateDailyRate(50_000) * workingDays
    );
  });

  test('80% with less gap can win over 100% with large gap', () => {
    // Kun mor, termin 22. jun 2026 (start 1. jun 2026). 100% slutter 10. mai 2027,
    // 80% slutter 2. aug 2027, barnehagestart 1. aug 2027: gap bare ved 100%.
    const mother = makeEconomy({ monthlySalary: 40_000 });
    const result = compareBoth(mother, undefined, {
      rights: 'mother-only',
      dueDate: new Date(2026, 5, 22),
      daycareStartDate: new Date(2027, 7, 1),
    });
    expect(result.scenario80.breakdown.gapCost).toBe(0);
    expect(result.scenario100.breakdown.gapCost).toBeGreaterThan(0);
    // 80% should be better when gap is 0 vs 92 days
    expect(result.difference).toBeLessThan(0); // negative means 80% better
  });
});

// ============================================================
// Akseptansekrav #4: Optimalisering av ulønnet perm
// ============================================================
describe('acceptance: gap optimization (lower earner takes gap)', () => {
  test('when mother earns 800k and father 500k, father takes gap', () => {
    const motherDaily = calculateDailyRate(800_000 / 12);
    const fatherDaily = calculateDailyRate(500_000 / 12);
    const result = calculateGapCost(motherDaily, fatherDaily, 60);
    expect(result.takenBy).toBe('father');
  });
});

describe('calculate100Scenario: gap går til forelder med permisjon i planen', () => {
  const gap: GapInfo = {
    start: new Date(2027, 1, 1),
    end: new Date(2027, 1, 15),
    weeks: 2,
    days: 14,
    workDays: 10,
  };
  const highEarner: ParentEconomy = {
    monthlySalary: 60_000,
    monthlyCommissionLoss: 0,
    employerCoversAbove6G: false,
    employerPaysFeriepenger: true,
  };
  const lowEarner: ParentEconomy = { ...highEarner, monthlySalary: 30_000 };

  test('far uten uker tar ikke gapet selv om han tjener minst', () => {
    const result = calculate100Scenario(highEarner, lowEarner, 40, 0, gap);
    expect(result.breakdown.gapTakenBy).toBe('mother');
  });

  test('mor uten uker (kun far) tar ikke gapet selv om hun tjener minst', () => {
    const result = calculate100Scenario(lowEarner, highEarner, 0, 40, gap);
    expect(result.breakdown.gapTakenBy).toBe('father');
  });

  test('begge har uker: lavest dagsats tar gapet', () => {
    const result = calculate100Scenario(highEarner, lowEarner, 20, 15, gap);
    expect(result.breakdown.gapTakenBy).toBe('father');
  });
});

// ============================================================
// Feriepengegrunnlag — explicit basis override
// ============================================================
describe('calculateFeriepengeDifference with feriepengegrunnlag', () => {
  test('uses explicit feriepengegrunnlag when provided', () => {
    const salary = 50_000;
    const basis = 700_000; // Higher than salary * 12 = 600k
    const result = calculateFeriepengeDifference(salary, 49, false, 100, basis);
    const defaultResult = calculateFeriepengeDifference(salary, 49, false, 100);
    // With higher basis, loss should be greater
    expect(result).toBeGreaterThan(defaultResult);
  });

  test('falls back to monthlySalary * 12 when feriepengegrunnlag is undefined', () => {
    const salary = 50_000;
    const withUndefined = calculateFeriepengeDifference(salary, 49, false, 100, undefined);
    const withoutParam = calculateFeriepengeDifference(salary, 49, false, 100);
    expect(withUndefined).toBe(withoutParam);
  });

  test('higher basis means larger feriepenge loss', () => {
    const salary = 50_000;
    const low = calculateFeriepengeDifference(salary, 49, false, 100, 500_000);
    const high = calculateFeriepengeDifference(salary, 49, false, 100, 900_000);
    expect(high).toBeGreaterThan(low);
  });
});

// ============================================================
// Cumulative time series
// ============================================================
describe('generateCumulativeTimeSeries', () => {
  const mother = makeEconomy({ monthlySalary: 50_000 });
  const father = makeEconomy({ monthlySalary: 40_000 });
  const dueDate = new Date(2027, 2, 15); // March 15, 2027
  const daycare = new Date(2028, 7, 1); // August 1, 2028
  const seriesInput = (rights: ParentRights, fatherEconomy: ParentEconomy | undefined): EconomyComparisonInput => ({
    dueDate,
    coverage: 80,
    rights,
    sharedWeeksToMother: 9,
    daycareStartDate: daycare,
    motherEconomy: mother,
    fatherEconomy,
  });

  test('returns non-empty array of time series points', () => {
    const result = generateCumulativeTimeSeries(seriesInput('both', father));
    expect(result.length).toBeGreaterThan(0);
  });

  test('cumulative values are monotonically non-decreasing', () => {
    const result = generateCumulativeTimeSeries(seriesInput('both', father));
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cumulative80).toBeGreaterThanOrEqual(result[i - 1].cumulative80);
      expect(result[i].cumulative100).toBeGreaterThanOrEqual(result[i - 1].cumulative100);
    }
  });

  test('each point has positive monthly income', () => {
    const result = generateCumulativeTimeSeries(seriesInput('both', father));
    for (const point of result) {
      expect(point.income80).toBeGreaterThanOrEqual(0);
      expect(point.income100).toBeGreaterThanOrEqual(0);
    }
  });

  test('works with mother-only rights', () => {
    const result = generateCumulativeTimeSeries(seriesInput('mother-only', undefined));
    expect(result.length).toBeGreaterThan(0);
    expect(result[result.length - 1].cumulative80).toBeGreaterThan(0);
  });
});

// ============================================================
// monthlyNavPayout
// ============================================================
describe('monthlyNavPayout', () => {
  test('100% dekning gir grunnlag / 12', () => {
    expect(monthlyNavPayout(600_000, 100)).toBe(50_000);
  });

  test('80% dekning gir 80% av grunnlag / 12', () => {
    expect(monthlyNavPayout(600_000, 80)).toBeCloseTo(40_000, 6);
  });

  test('grunnlag begrenset til 6G gir maks månedlig utbetaling', () => {
    const basis = calculateBasis(100_000, false);
    expect(monthlyNavPayout(basis, 100)).toBe(MAX_BASIS / 12);
    expect(monthlyNavPayout(basis, 80)).toBeCloseTo((MAX_BASIS * 0.8) / 12, 6);
  });
});
