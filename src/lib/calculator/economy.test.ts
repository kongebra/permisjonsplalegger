import { describe, test, expect } from 'bun:test';
import {
  calculateBasis,
  calculateDailyRate,
  calculateNavPayout,
  monthlyNavPayout,
  calculateCommissionLoss,
  calculateGapCost,
  calculateFeriepengeDifference,
  calculateScenarioGapCost,
  compareScenarios,
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
    const result = calculateScenarioGapCost(makeEconomy({ monthlySalary: 50_000 }), undefined, 26, 0, gap);
    // 4 arbeidsdager x 50 000 / 21,7 = 9 216,59
    expect(gap.workDays).toBe(4);
    expect(result.cost).toBeCloseTo(9_216.59, 2);
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

  test('håndregnet: 10,2 % av 600 000 / 52 x 37 uker', () => {
    // 50 000 x 12 = 600 000. 600 000 x 0,102 = 61 200. / 52 = 1 176,92 per uke. x 37 = 43 546,15
    expect(FERIEPENGER_RATE).toBe(0.102);
    const result = calculateFeriepengeDifference(50_000, 49, false, 100);
    expect(result).toBeCloseTo(43_546.15, 2);
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

  test('comparison shows that 100% pays off significantly', () => {
    const result = compareBoth(motherEconomy, fatherEconomy);
    // KRAVSPEC: "100 % lønner seg betydelig". Positiv forskjell = 100% gir mest.
    expect(result.difference).toBeGreaterThan(10_000);
    expect(result.scenario80.breakdown.commissionLoss).toBeGreaterThan(result.scenario100.breakdown.commissionLoss);
  });
});

// ============================================================
// Akseptansekrav #2: Gap-test
// ============================================================
describe('acceptance: gap test (100% ends may, daycare aug)', () => {
  test('gap cost uses working days, not calendar days', () => {
    const mother = makeEconomy({ monthlySalary: 50_000 });
    const gap100 = makeGap(92); // ~3 months gap
    const result = calculateScenarioGapCost(mother, undefined, 26, 0, gap100);
    const workingDays = countWorkingDaysInGap(gap100.start, gap100.end);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cost).toBeCloseTo(calculateDailyRate(50_000) * workingDays);
  });

  // Kun mor, 40 000 kr/mnd, termin 22. jun 2026 (start 1. jun 2026). 100% slutter mandag
  // 10. mai 2027, 80% slutter mandag 2. aug 2027, barnehagestart søndag 1. aug 2027.
  // Gapet ved 100% er 10. mai - 1. aug 2027: 12 uker = 60 hverdager minus 17. mai = 59 arbeidsdager.
  // Begge regnes til 2. aug 2027.
  //   ukesgrunnlag 480 000 / 52 = 9 230,77, dagsats 40 000 / 21,7 = 1 843,32,
  //   feriepenger 941,54 per uke og 188,31 per arbeidsdag
  //   100%: 49 * 9 230,77 = 452 307,69, lønn i gapet 59 * 1 843,32 = 108 755,76 tapes helt,
  //         feriepenger 37 * 941,54 + 59 * 188,31 = 45 947,08, total 406 360,62
  //   80%:  61 * 9 230,77 * 0,8 = 450 461,54, feriepenger 46 * 941,54 = 43 310,77, total 407 150,77
  const gapCase = () =>
    compareBoth(makeEconomy({ monthlySalary: 40_000 }), undefined, {
      rights: 'mother-only',
      dueDate: new Date(2026, 5, 22),
      daycareStartDate: new Date(2027, 7, 1),
    });

  test('tapt arbeidsinntekt i gapet trekkes fra i 100%-alternativet', () => {
    const result = gapCase();
    expect(result.scenario80.breakdown.gapCost).toBe(0);
    expect(result.scenario100.breakdown.gapCost).toBeCloseTo(108_755.76, 1);
    // Ingen lønn i gapet: lønnen som ellers ville kommet trekkes fra igjen
    expect(result.scenario100.breakdown.salaryIncome).toBeCloseTo(108_755.76, 1);
    // Juni 2027 ligger helt i gapet: ingen inntekt, bare tapt feriepengeopptjening (22 * 188,31)
    const june = result.timeSeries.find((p) => p.month.getTime() === new Date(2027, 5, 1).getTime());
    expect(june?.income100).toBeCloseTo(-22 * 188.31, 0);
    expect(result.scenario100.total).toBeCloseTo(406_360.62, 1);
  });

  test('12 ekstra uker med 80% veier opp for gapet: nesten likt totalt', () => {
    // Tidligere ble de 12 ukene telt to ganger: som NAV-utbetaling ved 80% og som
    // tapt lønn i gapet ved 100%. Over samme tidsrom er forskjellen bare 790,15 kr.
    const result = gapCase();
    expect(result.scenario80.total).toBeCloseTo(407_150.77, 1);
    expect(result.difference).toBeCloseTo(406_360.62 - 407_150.77, 1);
    expect(result.recommendation).toContain('familiens situasjon');
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
describe('compareScenarios: tidsserie til likviditetsgrafen', () => {
  const mother = makeEconomy({ monthlySalary: 50_000 });
  const father = makeEconomy({ monthlySalary: 40_000 });
  const dueDate = new Date(2027, 2, 15); // March 15, 2027 (permisjonsstart 22. feb 2027)
  const daycare = new Date(2028, 7, 1); // August 1, 2028
  const seriesInput = (
    rights: ParentRights,
    fatherEconomy: ParentEconomy | undefined,
    overrides: Partial<ParentEconomy> = {},
  ): EconomyComparisonInput => ({
    dueDate,
    coverage: 80,
    rights,
    sharedWeeksToMother: 9,
    daycareStartDate: daycare,
    motherEconomy: { ...mother, ...overrides },
    fatherEconomy: fatherEconomy && { ...fatherEconomy, ...overrides },
  });

  test('går fra permisjonsstart til måneden før barnehagestart', () => {
    const { timeSeries } = compareScenarios(seriesInput('both', father));
    expect(timeSeries[0].month).toEqual(new Date(2027, 1, 1));
    expect(timeSeries[timeSeries.length - 1].month).toEqual(new Date(2028, 6, 1));
  });

  test('kumulativ verdi er summen av månedene', () => {
    const { timeSeries } = compareScenarios(seriesInput('both', father));
    let sum80 = 0;
    let sum100 = 0;
    for (const point of timeSeries) {
      sum80 += point.income80;
      sum100 += point.income100;
      expect(point.cumulative80).toBeCloseTo(sum80, 6);
      expect(point.cumulative100).toBeCloseTo(sum100, 6);
    }
  });

  test('uten provisjon er tapt feriepengeopptjening i gapet det eneste som kan gi negativ måned', () => {
    // Far (40 000) tar gapet: maks 23 arbeidsdager * 480 000 * 0,102 / 260 = 4 331,08
    const { timeSeries } = compareScenarios(seriesInput('both', father, { employerPaysFeriepenger: true }));
    for (const point of timeSeries) {
      expect(point.income80).toBeGreaterThanOrEqual(-4_331.08);
      expect(point.income100).toBeGreaterThanOrEqual(-4_331.08);
    }
  });

  test('works with mother-only rights', () => {
    const { timeSeries } = compareScenarios(seriesInput('mother-only', undefined));
    expect(timeSeries.length).toBeGreaterThan(0);
    expect(timeSeries[timeSeries.length - 1].cumulative80).toBeGreaterThan(0);
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
