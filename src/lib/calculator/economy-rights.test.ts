import { describe, test, expect } from 'bun:test';
import { compareScenarios, hasEconomyInput } from './economy';
import { calculateLeave, getParentLeaveWeeks, getTotalLeaveWeeks } from './dates';
import { convertSharedWeeksToMother, getPrematureWeeks } from './leave-inputs';
import type { Coverage, ParentEconomy, ParentRights } from '../types';

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


/** Sammenligning med samme input som kalenderen bruker (valgt dekningsgrad og fellesuker i den enheten). */
function compare(
  rights: ParentRights,
  dueDate: Date,
  daycareStartDate: Date,
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  options: { coverage?: Coverage; sharedWeeksToMother?: number } = {},
) {
  return compareScenarios({
    dueDate,
    coverage: options.coverage ?? 100,
    rights,
    sharedWeeksToMother: options.sharedWeeksToMother ?? 8,
    daycareStartDate,
    motherEconomy,
    fatherEconomy,
  });
}

describe('compareScenarios: kun far', () => {
  // Termin 15. okt 2026, far starter på termin. 100%: 40 uker gir permisjonsslutt torsdag
  // 22. juli 2027, barnehagestart 1. okt 2027. 71 kalenderdager, torsdag til torsdag:
  // 10 hele uker (50 hverdager) + torsdag 30. sep = 51 arbeidsdager.
  // 80%: 52 uker gir slutt 14. okt 2027, ingen gap.
  const dueDate = new Date(2026, 9, 15);
  const daycare = new Date(2027, 9, 1);
  const farOnly = (father: ParentEconomy, mother: ParentEconomy = NO_ECONOMY) =>
    compare('father-only', dueDate, daycare, mother, father);

  test('100%: 40 uker, gapet tas av far, feriepenger etter 12 uker', () => {
    const result = farOnly(economy());
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
    const result = farOnly(economy());
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
    const withStale = farOnly(economy(), stale);
    const clean = farOnly(economy());
    expect(withStale.scenario100).toEqual(clean.scenario100);
    expect(withStale.scenario80).toEqual(clean.scenario80);
    expect(withStale.scenario100.breakdown.gapTakenBy).toBe('father');
  });

  test('lønn over 6G kappes: 819 294 / 52 * 40 = 630 226,15', () => {
    const result = farOnly(economy({ monthlySalary: 100_000 }));
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(630_226.15, 1);
  });

  test('provisjonstap følger fars uker: 40 uker / 4,33 * 10 000', () => {
    const result = farOnly(economy({ monthlyCommissionLoss: 10_000 }));
    expect(result.scenario100.breakdown.commissionLoss).toBeCloseTo((40 / 4.33) * 10_000, 4);
    expect(result.scenario80.breakdown.commissionLoss).toBeCloseTo((52 / 4.33) * 10_000, 4);
  });
});

describe('anbefalingstekst: retning følger hvem som lønner seg', () => {
  test('kun far, 80% lønner seg: teksten snakker om 80% og 12 ekstra uker', () => {
    const result = compare('father-only', new Date(2026, 9, 15), new Date(2027, 9, 1), NO_ECONOMY, economy());
    expect(result.difference).toBeLessThan(-10_000);
    expect(result.recommendation).toContain('80%-permisjonen 12 uker ekstra');
    expect(result.recommendation).toContain('kortere udekket gap');
    expect(result.recommendation).not.toContain('100% gir høyere');
  });

  test('100% lønner seg: teksten snakker om 100% og høyere utbetaling', () => {
    // Kun mor med 12 000 i provisjon per måned. Termin 14. sep 2026 (start 24. aug 2026),
    // barnehagestart 1. aug 2027: begge permisjonene varer forbi barnehagestart, så ingen gap.
    //   100%: 565 384,62 - 49 / 4,33 * 12 000 (135 796,77) - 43 546,15 = 386 041,70
    //   80%:  563 076,92 - 61 / 4,33 * 12 000 (169 053,12) - 54 138,46 = 339 885,34
    const result = compare(
      'mother-only',
      new Date(2026, 8, 14),
      new Date(2027, 7, 1),
      economy({ monthlyCommissionLoss: 12_000 }),
      undefined,
    );
    expect(result.difference).toBeCloseTo(386_041.70 - 339_885.34, 0);
    expect(result.recommendation).toContain('100% gir høyere utbetaling');
    expect(result.recommendation).toContain('mindre provisjonstap');
  });
});

describe('compareScenarios: kun mor', () => {
  // Termin 14. sep 2026, permisjonsstart 24. aug 2026. 100%: 49 uker gir slutt mandag
  // 2. aug 2027. Barnehagestart mandag 9. aug 2027: én uke gap = 5 arbeidsdager = 11 520,74.
  // 80%: 61 uker gir slutt 25. okt 2027, ingen gap.
  const dueDate = new Date(2026, 8, 14);
  const daycare = new Date(2027, 7, 9);

  test('100%: 49 uker til mor, 37 uker uten feriepenger', () => {
    const result = compare('mother-only', dueDate, daycare, economy(), undefined);
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
    const result = compare('mother-only', dueDate, daycare, economy(), undefined);
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
    const withStale = compare('mother-only', dueDate, daycare, economy(), stale);
    const clean = compare('mother-only', dueDate, daycare, economy(), undefined);
    expect(withStale.scenario100).toEqual(clean.scenario100);
    expect(withStale.scenario80).toEqual(clean.scenario80);
    expect(withStale.scenario100.breakdown.gapTakenBy).toBe('mother');
  });
});

describe('compareScenarios: prematur fødsel', () => {
  // Termin 14. sep 2026. Med 4 premature uker får mor 4 ekstra uker i kalenderen
  // (calculateLeave legger dem til mors periode), og økonomien må bruke de samme ukene.
  const dueDate = new Date(2026, 8, 14);
  const daycare = new Date(2028, 7, 1);

  test('kun mor: 49 + 4 = 53 uker ved 100%, 61 + 4 = 65 uker ved 80%', () => {
    const leave100 = calculateLeave(dueDate, 100, 'mother-only', 8, 0, daycare, [], undefined, 4);
    expect(leave100.mother.weeks).toBe(53);

    const result = compareScenarios({
      dueDate,
      coverage: 100,
      rights: 'mother-only',
      sharedWeeksToMother: 8,
      daycareStartDate: daycare,
      prematureWeeks: 4,
      motherEconomy: economy(),
    });
    // 53 * 11 538,46 = 611 538,46
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(611_538.46, 1);
    // 65 * 11 538,46 * 0,8 = 600 000
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(600_000, 1);
    // Feriepenger: (53 - 12) * 1 176,92 = 48 253,85
    expect(result.scenario100.breakdown.feriepengeDifference).toBeCloseTo(48_253.85, 1);
  });

  test('begge: mor får de premature ukene, far er uendret', () => {
    const result = compareScenarios({
      dueDate,
      coverage: 100,
      rights: 'both',
      sharedWeeksToMother: 8,
      daycareStartDate: daycare,
      prematureWeeks: 2,
      motherEconomy: economy({ monthlySalary: 60_000 }),
      fatherEconomy: economy({ monthlySalary: 40_000 }),
    });
    // Mor 26 + 2 = 28, far 23: 28 * 13 846,15 + 23 * 9 230,77 = 387 692,31 + 212 307,69 = 600 000
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(600_000, 1);
  });
});

describe('getPrematureWeeks', () => {
  // Termin 14. sep 2026, ordinær permisjonsstart 24. aug 2026 (3 uker før termin).
  const dueDate = new Date(2026, 8, 14);

  test('ingen fødselsdato eller fødsel etter uke 33 gir 0', () => {
    expect(getPrematureWeeks(dueDate, 100, null)).toBe(0);
    // 7 uker før termin = 27. jul 2026, ikke før grensen
    expect(getPrematureWeeks(dueDate, 100, new Date(2026, 6, 27))).toBe(0);
  });

  test('født 8 uker før termin: uker fra fødsel til ordinær permisjonsstart', () => {
    // 20. jul 2026 til 24. aug 2026 = 5 uker
    expect(getPrematureWeeks(dueDate, 100, new Date(2026, 6, 20))).toBe(5);
    expect(getPrematureWeeks(dueDate, 80, new Date(2026, 6, 20))).toBe(5);
  });
});

describe('convertSharedWeeksToMother', () => {
  test('beholder andelen og runder til hele uker', () => {
    // 8 av 16 (100%) = halvparten = 10 av 20 (80%)
    expect(convertSharedWeeksToMother(8, 100, 80)).toBe(10);
    expect(convertSharedWeeksToMother(10, 80, 100)).toBe(8);
    // 9 av 20 = 0,45 * 16 = 7,2 -> 7
    expect(convertSharedWeeksToMother(9, 80, 100)).toBe(7);
    // 5 av 16 = 0,3125 * 20 = 6,25 -> 6
    expect(convertSharedWeeksToMother(5, 100, 80)).toBe(6);
  });

  test('samme dekningsgrad gir samme tall, og ytterpunktene beholdes', () => {
    expect(convertSharedWeeksToMother(7, 100, 100)).toBe(7);
    expect(convertSharedWeeksToMother(0, 100, 80)).toBe(0);
    expect(convertSharedWeeksToMother(16, 100, 80)).toBe(20);
    expect(convertSharedWeeksToMother(20, 80, 100)).toBe(16);
  });
});

describe('compareScenarios: begge, fellesuker i valgt dekningsgrad', () => {
  // Store og kalender lagrer fellesukene i valgt dekningsgrads enhet. Mor 60 000
  // (720 000 / 52 = 13 846,15 per uke), far 40 000 (480 000 / 52 = 9 230,77 per uke).
  const dueDate = new Date(2026, 8, 14);
  const daycare = new Date(2028, 7, 1);
  const mother = economy({ monthlySalary: 60_000 });
  const father = economy({ monthlySalary: 40_000 });

  test('100% valgt med 8 fellesuker: økonomien bruker 26/23 uker som kalenderen', () => {
    const leave = calculateLeave(dueDate, 100, 'both', 8, 0, daycare);
    expect(leave.mother.weeks).toBe(26);
    expect(leave.father.weeks).toBe(23);

    const result = compare('both', dueDate, daycare, mother, father, { coverage: 100, sharedWeeksToMother: 8 });
    // 26 * 13 846,15 + 23 * 9 230,77 = 360 000 + 212 307,69 = 572 307,69
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(572_307.69, 1);
    // 80%: 8 av 16 = 10 av 20, mor 3 + 19 + 10 = 32, far 19 + 10 = 29
    // 0,8 * (32 * 13 846,15 + 29 * 9 230,77) = 0,8 * 710 769,23 = 568 615,38
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(568_615.38, 1);
  });

  test('80% valgt med 10 fellesuker gir samme sammenligning som 100% med 8', () => {
    const from100 = compare('both', dueDate, daycare, mother, father, { coverage: 100, sharedWeeksToMother: 8 });
    const from80 = compare('both', dueDate, daycare, mother, father, { coverage: 80, sharedWeeksToMother: 10 });
    expect(from80.scenario80).toEqual(from100.scenario80);
    expect(from80.scenario100).toEqual(from100.scenario100);
    expect(from80.difference).toBe(from100.difference);
  });

  test('80% valgt: 80%-scenariet bruker ukene kalenderen viser', () => {
    const leave = calculateLeave(dueDate, 80, 'both', 9, 0, daycare);
    const result = compare('both', dueDate, daycare, mother, father, { coverage: 80, sharedWeeksToMother: 9 });
    // Kalender: mor 3 + 19 + 9 = 31, far 19 + 11 = 30
    expect(leave.mother.weeks).toBe(31);
    expect(leave.father.weeks).toBe(30);
    // 0,8 * (31 * 13 846,15 + 30 * 9 230,77) = 0,8 * 706 153,85 = 564 923,08
    expect(result.scenario80.breakdown.navPayout).toBeCloseTo(564_923.08, 1);
    // 100%: round(9 / 20 * 16) = 7, mor 25, far 24: 25 * 13 846,15 + 24 * 9 230,77 = 567 692,31
    expect(result.scenario100.breakdown.navPayout).toBeCloseTo(567_692.31, 1);
  });
});
