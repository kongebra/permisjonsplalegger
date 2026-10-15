import { describe, test, expect } from 'bun:test';
import { calculateScenario, calculateScenarioGapCost } from './economy';
import { addWeeks, calculateGap } from './dates';
import { G } from '../constants';
import type { Coverage, GapInfo, LeaveResult, LeaveSegment, ParentEconomy } from '../types';

// ============================================================
// calculateScenario (ett scenario dag for dag over et felles tidsrom)
//
// Forventede verdier er regnet ut for hånd fra reglene i
// docs/nav/foreldrepenger.md og konstantene, uavhengig av hjelpefunksjonene:
//   - NAV-grunnlag = årslønn, maks 6G (6 x 136 549 = 819 294)
//   - utbetaling = grunnlag / 52 x uker x dekningsgrad
//   - dagsats = månedslønn / 21,7 per arbeidsdag (man-fre uten helligdager)
//   - provisjonstap = månedlig tap x (uker / 4,33) i permisjon,
//     og månedlig tap / 21,7 per arbeidsdag i et ulønnet gap
//   - feriepenger: NAV gir opptjening de første 15 ukene ved 80 % (12 ved 100 %),
//     tapt opptjening = årslønn x 10,2 % / 52 x uker over grensen
//     (0 hvis arbeidsgiver betaler feriepenger). Ulønnet gap gir ingen
//     opptjening: årslønn x 10,2 % / 260 per arbeidsdag i gapet.
//   - total = NAV + lønn utenfor permisjon - udekket gap - provisjon - feriepenger
// ============================================================

function economy(overrides: Partial<ParentEconomy> = {}): ParentEconomy {
  return {
    monthlySalary: 50_000,
    monthlyCommissionLoss: 0,
    employerCoversAbove6G: false,
    employerPaysFeriepenger: true,
    ...overrides,
  };
}

// Mandag 14. sep 2026. 20 uker gir slutt mandag 1. feb 2027 (eksklusiv).
const START = new Date(2026, 8, 14);

/**
 * Enkel plan: mor først, så far. Gapet går fra siste permisjonsdag til `gapEnd`
 * (ingen gap uten `gapEnd`). Tidsrommet er fra start til slutten av gapet.
 */
function plan(motherWeeks: number, fatherWeeks: number, gapEnd?: Date) {
  const segments: LeaveSegment[] = [];
  const motherEnd = addWeeks(START, motherWeeks);
  if (motherWeeks > 0) {
    segments.push({ parent: 'mother', type: 'quota', start: START, end: motherEnd, weeks: motherWeeks });
  }
  const fatherEnd = addWeeks(motherEnd, fatherWeeks);
  if (fatherWeeks > 0) {
    segments.push({ parent: 'father', type: 'quota', start: motherEnd, end: fatherEnd, weeks: fatherWeeks });
  }
  const gap = calculateGap(fatherEnd, gapEnd ?? fatherEnd);
  const leave: LeaveResult = {
    segments,
    mother: { start: START, end: motherEnd, weeks: motherWeeks },
    father: { start: motherEnd, end: fatherEnd, weeks: fatherWeeks },
    overlap: null,
    gap,
    totalCalendarWeeks: motherWeeks + fatherWeeks,
    vacationDaysNeeded: { mother: 0, father: 0 },
  };
  const end = gapEnd && gapEnd > fatherEnd ? gapEnd : fatherEnd;
  return { leave, horizon: { start: START, end } };
}

function scenario(
  coverage: Coverage,
  mother: ParentEconomy | undefined,
  father: ParentEconomy | undefined,
  motherWeeks: number,
  fatherWeeks: number,
  gapEnd?: Date,
) {
  const { leave, horizon } = plan(motherWeeks, fatherWeeks, gapEnd);
  return calculateScenario(coverage, leave, mother, father, horizon);
}

describe('calculateScenario: NAV-utbetaling', () => {
  test('mor alene, ingen gap, arbeidsgiver betaler feriepenger: kun NAV-utbetaling', () => {
    const result = scenario(80, economy(), undefined, 20, 0);
    const expectedPayout = (600_000 / 52) * 20 * 0.8; // 184 615,38
    expect(result.breakdown.navPayout).toBeCloseTo(expectedPayout, 2);
    expect(result.breakdown.salaryIncome).toBe(0);
    expect(result.breakdown.commissionLoss).toBe(0);
    expect(result.breakdown.gapCost).toBe(0);
    expect(result.breakdown.gapTakenBy).toBeNull();
    expect(result.breakdown.feriepengeDifference).toBe(0);
    expect(result.total).toBeCloseTo(expectedPayout, 2);
  });

  test('utbetalingen er 80 % av grunnlaget', () => {
    const result = scenario(80, economy(), undefined, 52, 0);
    // 52 uker = ett helt år: 0,8 x 600 000
    expect(result.breakdown.navPayout).toBeCloseTo(480_000, 2);
  });

  test('100 % gir hele grunnlaget', () => {
    const result = scenario(100, economy(), undefined, 52, 0);
    expect(result.breakdown.navPayout).toBeCloseTo(600_000, 2);
  });

  test('grunnlaget kappes ved 6G når arbeidsgiver ikke dekker over 6G', () => {
    const result = scenario(80, economy({ monthlySalary: 100_000 }), undefined, 20, 0);
    const expected = ((6 * G) / 52) * 20 * 0.8;
    expect(result.breakdown.navPayout).toBeCloseTo(expected, 2);
  });

  test('grunnlaget kappes ikke når arbeidsgiver dekker over 6G', () => {
    const result = scenario(80, economy({ monthlySalary: 100_000, employerCoversAbove6G: true }), undefined, 20, 0);
    const expected = (1_200_000 / 52) * 20 * 0.8;
    expect(result.breakdown.navPayout).toBeCloseTo(expected, 2);
  });

  test('provisjonstap beregnes per måned (uker / 4,33)', () => {
    const result = scenario(80, economy({ monthlyCommissionLoss: 3_000 }), undefined, 20, 0);
    const expectedLoss = 3_000 * (20 / 4.33);
    expect(result.breakdown.commissionLoss).toBeCloseTo(expectedLoss, 2);
    const payout = (600_000 / 52) * 20 * 0.8;
    expect(result.total).toBeCloseTo(payout - expectedLoss, 2);
  });
});

describe('calculateScenario: feriepenger', () => {
  test('ingen differanse innenfor de første 15 ukene (NAV dekker)', () => {
    const result = scenario(80, economy({ employerPaysFeriepenger: false }), undefined, 15, 0);
    expect(result.breakdown.feriepengeDifference).toBe(0);
  });

  test('tapt opptjening for uker utover 15', () => {
    const result = scenario(80, economy({ employerPaysFeriepenger: false }), undefined, 20, 0);
    const expected = ((600_000 * 0.102) / 52) * 5; // 5 uker uten dekning = 5 884,62
    expect(result.breakdown.feriepengeDifference).toBeCloseTo(expected, 2);
    const payout = (600_000 / 52) * 20 * 0.8;
    expect(result.total).toBeCloseTo(payout - expected, 2);
  });

  test('ved 100 % dekker NAV bare de første 12 ukene', () => {
    const result = scenario(100, economy({ employerPaysFeriepenger: false }), undefined, 20, 0);
    expect(result.breakdown.feriepengeDifference).toBeCloseTo(((600_000 * 0.102) / 52) * 8, 2);
  });

  test('feriepengegrunnlag overstyrer månedslønn x 12', () => {
    const result = scenario(
      80,
      economy({ employerPaysFeriepenger: false, feriepengegrunnlag: 400_000 }),
      undefined,
      20,
      0,
    );
    const expected = ((400_000 * 0.102) / 52) * 5;
    expect(result.breakdown.feriepengeDifference).toBeCloseTo(expected, 2);
  });

  test('ingen differanse i permisjonen når arbeidsgiver betaler feriepenger', () => {
    const result = scenario(80, economy({ employerPaysFeriepenger: true }), undefined, 30, 0);
    expect(result.breakdown.feriepengeDifference).toBe(0);
  });
});

describe('calculateScenario: gap', () => {
  // Mor har 20 uker til mandag 1. feb 2027. Gapet varer til mandag 15. feb 2027:
  // 14 kalenderdager = 10 arbeidsdager. Dagsats 50 000 / 21,7 = 2 304,15.
  const GAP_END = new Date(2027, 1, 15);

  test('gap-kostnad bruker dagsats x arbeidsdager (mandag-fredag)', () => {
    const result = scenario(80, economy(), undefined, 20, 0, GAP_END);
    expect(result.breakdown.gapCost).toBeCloseTo((50_000 / 21.7) * 10, 2); // 23 041,47
    expect(result.breakdown.gapTakenBy).toBe('mother');
  });

  test('gapet gir ingen inntekt: lønnen i gapet trekkes fra igjen som udekket gap', () => {
    const result = scenario(80, economy(), undefined, 20, 0, GAP_END);
    const payout = (600_000 / 52) * 20 * 0.8;
    // Lønn utenfor permisjon er de 10 arbeidsdagene i gapet, og de tapes
    expect(result.breakdown.salaryIncome).toBeCloseTo((50_000 / 21.7) * 10, 2);
    // Ulønnet gap gir ingen feriepengeopptjening, selv om arbeidsgiver betaler
    // feriepenger i permisjonen: 10 x 600 000 x 0,102 / 260 = 2 353,85
    expect(result.breakdown.feriepengeDifference).toBeCloseTo(2_353.85, 2);
    expect(result.total).toBeCloseTo(payout - 2_353.85, 2);
  });

  test('helligdager i gapet gir verken lønn eller gap-kostnad', () => {
    // Mor har 33 uker fra 14. sep 2026, så permisjonen slutter 3. mai 2027. Gapet
    // 3. mai - 24. mai 2027 har 15 hverdager, men 6. mai (Kristi himmelfart) og
    // 17. mai er helligdager: 13 arbeidsdager.
    const { leave, horizon } = plan(33, 0, new Date(2027, 4, 24));
    expect(leave.gap.start).toEqual(new Date(2027, 4, 3));
    expect(leave.gap.workDays).toBe(13);
    const result = calculateScenario(80, leave, economy(), undefined, horizon);
    expect(result.breakdown.gapCost).toBeCloseTo(13 * (50_000 / 21.7), 2);
    expect(result.breakdown.salaryIncome).toBeCloseTo(13 * (50_000 / 21.7), 2);
  });

  test('provisjonen tapes også i et ulønnet gap: 10 x 3 000 / 21,7', () => {
    const result = scenario(80, economy({ monthlyCommissionLoss: 3_000 }), undefined, 20, 0, GAP_END);
    expect(result.breakdown.commissionLoss).toBeCloseTo(3_000 * (20 / 4.33) + (3_000 / 21.7) * 10, 2);
  });

  test('forelderen med lavest dagsats tar gapet', () => {
    // Mor 20 uker, far 20 uker til 21. jun 2027, gap til 5. jul 2027 = 10 arbeidsdager
    const result = scenario(
      80,
      economy({ monthlySalary: 60_000 }),
      economy({ monthlySalary: 40_000 }),
      20,
      20,
      new Date(2027, 6, 5),
    );
    expect(result.breakdown.gapTakenBy).toBe('father');
    expect(result.breakdown.gapCost).toBeCloseTo((40_000 / 21.7) * 10, 2);
  });

  test('ved lik dagsats tar mor gapet', () => {
    const result = scenario(80, economy(), economy(), 20, 20, new Date(2027, 6, 5));
    expect(result.breakdown.gapTakenBy).toBe('mother');
  });
});

describe('calculateScenario: begge foreldre', () => {
  test('far inkluderes med egen utbetaling og provisjonstap', () => {
    const mother = economy();
    const father = economy({ monthlySalary: 40_000, monthlyCommissionLoss: 1_000 });
    const result = scenario(80, mother, father, 20, 10);
    const motherPayout = (600_000 / 52) * 20 * 0.8;
    const fatherPayout = (480_000 / 52) * 10 * 0.8;
    expect(result.breakdown.navPayout).toBeCloseTo(motherPayout + fatherPayout, 2);
    expect(result.breakdown.commissionLoss).toBeCloseTo(1_000 * (10 / 4.33), 2);
  });

  test('feriepengedifferanse summeres for begge foreldre', () => {
    const mother = economy({ employerPaysFeriepenger: false });
    const father = economy({ monthlySalary: 40_000, employerPaysFeriepenger: false });
    const result = scenario(80, mother, father, 20, 17);
    const motherLoss = ((600_000 * 0.102) / 52) * 5;
    const fatherLoss = ((480_000 * 0.102) / 52) * 2;
    expect(result.breakdown.feriepengeDifference).toBeCloseTo(motherLoss + fatherLoss, 2);
  });

  test('forelderen som ikke har permisjon tjener lønn alle hverdager, også helligdager', () => {
    // Mor har permisjon 14. sep 2026 - 1. feb 2027 (20 uker). Far jobber hele tiden:
    // 100 hverdager. Fastlønn betales også 1. juledag og 1. nyttårsdag (21,7 dager per
    // måned regner med helligdager), ellers ville 100% tapt på hver helligdag.
    const result = scenario(80, economy(), economy({ monthlySalary: 40_000, monthlyCommissionLoss: 5_000 }), 20, 0);
    expect(result.breakdown.salaryIncome).toBeCloseTo(100 * (40_000 / 21.7), 2); // 184 331,80
    // Far har ingen permisjon, så hans provisjon og NAV teller ikke
    expect(result.breakdown.navPayout).toBeCloseTo((600_000 / 52) * 20 * 0.8, 2);
    expect(result.breakdown.commissionLoss).toBe(0);
  });
});

describe('calculateScenario: total og månedssummer', () => {
  test('total er NAV + lønn - gap - provisjon - feriepenger', () => {
    const result = scenario(
      80,
      economy({ employerPaysFeriepenger: false, monthlyCommissionLoss: 2_000 }),
      economy({ monthlySalary: 45_000, employerPaysFeriepenger: false }),
      19,
      19,
      new Date(2027, 7, 2),
    );
    const b = result.breakdown;
    expect(result.total).toBeCloseTo(
      b.navPayout + b.salaryIncome - b.gapCost - b.commissionLoss - b.feriepengeDifference,
      6,
    );
  });

  test('summen av månedene er lik totalen (grafen og kortet viser samme tall)', () => {
    const result = scenario(
      100,
      economy({ employerPaysFeriepenger: false, monthlyCommissionLoss: 2_000 }),
      economy({ monthlySalary: 45_000 }),
      26,
      23,
      new Date(2027, 11, 1),
    );
    const sum = result.monthly.reduce((acc, m) => acc + m.income, 0);
    expect(sum).toBeCloseTo(result.total, 6);
    // Første måned er permisjonsstarten, siste er måneden før barnehagestart
    expect(result.monthly[0].month).toEqual(new Date(2026, 8, 1));
    expect(result.monthly[result.monthly.length - 1].month).toEqual(new Date(2027, 10, 1));
  });
});

// ============================================================
// calculateScenarioGapCost: hvem tar gapet
// ============================================================
describe('calculateScenarioGapCost', () => {
  // Mandag 1. februar til mandag 15. februar 2027 (eksklusiv slutt): 10 arbeidsdager
  const TWO_WEEK_GAP: GapInfo = calculateGap(new Date(2027, 1, 1), new Date(2027, 1, 15));

  test('helgedager i gapet gir ikke kostnad', () => {
    // Lørdag 6. til mandag 8. februar 2027 (eksklusiv slutt) = kun helg
    const weekendGap = calculateGap(new Date(2027, 1, 6), new Date(2027, 1, 8));
    const result = calculateScenarioGapCost(economy(), undefined, 20, 0, weekendGap);
    expect(result.cost).toBe(0);
    expect(result.takenBy).toBeNull();
  });

  // Gapet er tiden etter at permisjonen er brukt opp, og anbefalingen om hvem
  // som tar den ulønnede permisjonen skal gå til en forelder som faktisk har
  // permisjon i planen (kun mor -> mor, kun far -> far).
  test('far uten uker i planen tar ikke gapet, selv om dagsatsen hans er lavest', () => {
    const result = calculateScenarioGapCost(
      economy({ monthlySalary: 60_000 }),
      economy({ monthlySalary: 30_000 }),
      20,
      0,
      TWO_WEEK_GAP,
    );
    expect(result.takenBy).toBe('mother');
    expect(result.cost).toBeCloseTo((60_000 / 21.7) * 10, 2);
  });

  test('mor uten uker i planen (kun far) tar ikke gapet, selv om dagsatsen hennes er lavest', () => {
    const result = calculateScenarioGapCost(
      economy({ monthlySalary: 30_000 }),
      economy({ monthlySalary: 60_000 }),
      0,
      40,
      TWO_WEEK_GAP,
    );
    expect(result.takenBy).toBe('father');
    expect(result.cost).toBeCloseTo((60_000 / 21.7) * 10, 2);
  });

  test('når begge har uker velges lavest dagsats', () => {
    const result = calculateScenarioGapCost(
      economy({ monthlySalary: 60_000 }),
      economy({ monthlySalary: 30_000 }),
      20,
      10,
      TWO_WEEK_GAP,
    );
    expect(result.takenBy).toBe('father');
  });

  test('ingen har uker: faller tilbake på lavest dagsats blant dem som har oppgitt økonomi', () => {
    const result = calculateScenarioGapCost(
      economy({ monthlySalary: 60_000 }),
      economy({ monthlySalary: 30_000 }),
      0,
      0,
      TWO_WEEK_GAP,
    );
    expect(result.takenBy).toBe('father');
  });
});
