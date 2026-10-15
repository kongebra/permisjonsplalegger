import { describe, test, expect } from 'bun:test';
import { calculate80Scenario } from './economy';
import { G } from '../constants';
import type { GapInfo, ParentEconomy } from '../types';

// ============================================================
// calculate80Scenario
//
// Forventede verdier er regnet ut for hånd fra reglene i
// docs/nav/foreldrepenger.md og konstantene, uavhengig av hjelpefunksjonene:
//   - NAV-grunnlag = årslønn, maks 6G (6 x 130 160 = 780 960)
//   - utbetaling = grunnlag / 52 x uker x 0,8
//   - dagsats = månedslønn / 21,7, gap teller kun mandag-fredag
//   - provisjonstap = månedlig tap x (uker / 4,33)
//   - feriepenger: NAV gir opptjening de første 15 ukene ved 80 %,
//     tapt opptjening = årslønn x 10,2 % / 52 x uker over 15
//     (0 hvis arbeidsgiver betaler feriepenger)
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

// Ingen gap: start = slutt
const NO_GAP: GapInfo = {
  start: new Date(2027, 7, 17),
  end: new Date(2027, 7, 17),
  weeks: 0,
  days: 0,
  workDays: 0,
};

// Mandag 1. februar til mandag 15. februar 2027 (eksklusiv slutt):
// 14 kalenderdager = 10 arbeidsdager
const TWO_WEEK_GAP: GapInfo = {
  start: new Date(2027, 1, 1),
  end: new Date(2027, 1, 15),
  weeks: 2,
  days: 14,
  workDays: 10,
};

describe('calculate80Scenario', () => {
  test('mor alene, ingen gap, arbeidsgiver betaler feriepenger: kun NAV-utbetaling', () => {
    const result = calculate80Scenario(economy(), undefined, 20, 0, NO_GAP);
    const expectedPayout = (600_000 / 52) * 20 * 0.8; // 184 615,38
    expect(result.breakdown.navPayout).toBeCloseTo(expectedPayout, 2);
    expect(result.breakdown.commissionLoss).toBe(0);
    expect(result.breakdown.gapCost).toBe(0);
    expect(result.breakdown.gapTakenBy).toBeNull();
    expect(result.breakdown.feriepengeDifference).toBe(0);
    expect(result.total).toBeCloseTo(expectedPayout, 2);
  });

  test('utbetalingen er 80 % av grunnlaget', () => {
    const result = calculate80Scenario(economy(), undefined, 52, 0, NO_GAP);
    // 52 uker = ett helt år: 0,8 x 600 000
    expect(result.breakdown.navPayout).toBeCloseTo(480_000, 2);
  });

  test('grunnlaget kappes ved 6G når arbeidsgiver ikke dekker over 6G', () => {
    const result = calculate80Scenario(
      economy({ monthlySalary: 100_000 }),
      undefined,
      20,
      0,
      NO_GAP
    );
    const expected = ((6 * G) / 52) * 20 * 0.8;
    expect(result.breakdown.navPayout).toBeCloseTo(expected, 2);
  });

  test('grunnlaget kappes ikke når arbeidsgiver dekker over 6G', () => {
    const result = calculate80Scenario(
      economy({ monthlySalary: 100_000, employerCoversAbove6G: true }),
      undefined,
      20,
      0,
      NO_GAP
    );
    const expected = (1_200_000 / 52) * 20 * 0.8;
    expect(result.breakdown.navPayout).toBeCloseTo(expected, 2);
  });

  test('provisjonstap beregnes per måned (uker / 4,33)', () => {
    const result = calculate80Scenario(
      economy({ monthlyCommissionLoss: 3_000 }),
      undefined,
      20,
      0,
      NO_GAP
    );
    const expectedLoss = 3_000 * (20 / 4.33);
    expect(result.breakdown.commissionLoss).toBeCloseTo(expectedLoss, 2);
    const payout = (600_000 / 52) * 20 * 0.8;
    expect(result.total).toBeCloseTo(payout - expectedLoss, 2);
  });

  describe('feriepenger', () => {
    test('ingen differanse innenfor de første 15 ukene (NAV dekker)', () => {
      const result = calculate80Scenario(
        economy({ employerPaysFeriepenger: false }),
        undefined,
        15,
        0,
        NO_GAP
      );
      expect(result.breakdown.feriepengeDifference).toBe(0);
    });

    test('tapt opptjening for uker utover 15', () => {
      const result = calculate80Scenario(
        economy({ employerPaysFeriepenger: false }),
        undefined,
        20,
        0,
        NO_GAP
      );
      const expected = ((600_000 * 0.102) / 52) * 5; // 5 uker uten dekning
      expect(result.breakdown.feriepengeDifference).toBeCloseTo(expected, 2);
      const payout = (600_000 / 52) * 20 * 0.8;
      expect(result.total).toBeCloseTo(payout - expected, 2);
    });

    test('feriepengegrunnlag overstyrer månedslønn x 12', () => {
      const result = calculate80Scenario(
        economy({ employerPaysFeriepenger: false, feriepengegrunnlag: 400_000 }),
        undefined,
        20,
        0,
        NO_GAP
      );
      const expected = ((400_000 * 0.102) / 52) * 5;
      expect(result.breakdown.feriepengeDifference).toBeCloseTo(expected, 2);
    });

    test('ingen differanse når arbeidsgiver betaler feriepenger', () => {
      const result = calculate80Scenario(
        economy({ employerPaysFeriepenger: true }),
        undefined,
        30,
        0,
        NO_GAP
      );
      expect(result.breakdown.feriepengeDifference).toBe(0);
    });
  });

  describe('gap', () => {
    test('gap-kostnad bruker dagsats x arbeidsdager (mandag-fredag)', () => {
      const result = calculate80Scenario(economy(), undefined, 20, 0, TWO_WEEK_GAP);
      const dailyRate = 50_000 / 21.7;
      expect(result.breakdown.gapCost).toBeCloseTo(dailyRate * 10, 2);
      expect(result.breakdown.gapTakenBy).toBe('mother');
    });

    test('helgedager i gapet gir ikke kostnad', () => {
      // Lørdag 6. til mandag 8. februar 2027 (eksklusiv slutt) = kun helg
      const weekendGap: GapInfo = {
        start: new Date(2027, 1, 6),
        end: new Date(2027, 1, 8),
        weeks: 1,
        days: 2,
        workDays: 0,
      };
      const result = calculate80Scenario(economy(), undefined, 20, 0, weekendGap);
      expect(result.breakdown.gapCost).toBe(0);
      expect(result.breakdown.gapTakenBy).toBeNull();
    });

    test('forelderen med lavest dagsats tar gapet', () => {
      const mother = economy({ monthlySalary: 60_000 });
      const father = economy({ monthlySalary: 40_000 });
      const result = calculate80Scenario(mother, father, 20, 20, TWO_WEEK_GAP);
      expect(result.breakdown.gapTakenBy).toBe('father');
      expect(result.breakdown.gapCost).toBeCloseTo((40_000 / 21.7) * 10, 2);
    });

    test('ved lik dagsats tar mor gapet', () => {
      const result = calculate80Scenario(economy(), economy(), 20, 20, TWO_WEEK_GAP);
      expect(result.breakdown.gapTakenBy).toBe('mother');
    });

    test('total trekker fra gap-kostnaden', () => {
      const result = calculate80Scenario(economy(), undefined, 20, 0, TWO_WEEK_GAP);
      const payout = (600_000 / 52) * 20 * 0.8;
      const gapCost = (50_000 / 21.7) * 10;
      expect(result.total).toBeCloseTo(payout - gapCost, 2);
    });
  });

  describe('far', () => {
    test('far inkluderes med egen utbetaling og provisjonstap', () => {
      const mother = economy();
      const father = economy({ monthlySalary: 40_000, monthlyCommissionLoss: 1_000 });
      const result = calculate80Scenario(mother, father, 20, 10, NO_GAP);
      const motherPayout = (600_000 / 52) * 20 * 0.8;
      const fatherPayout = (480_000 / 52) * 10 * 0.8;
      expect(result.breakdown.navPayout).toBeCloseTo(motherPayout + fatherPayout, 2);
      expect(result.breakdown.commissionLoss).toBeCloseTo(1_000 * (10 / 4.33), 2);
    });

    test('feriepengedifferanse summeres for begge foreldre', () => {
      const mother = economy({ employerPaysFeriepenger: false });
      const father = economy({
        monthlySalary: 40_000,
        employerPaysFeriepenger: false,
      });
      const result = calculate80Scenario(mother, father, 20, 17, NO_GAP);
      const motherLoss = ((600_000 * 0.102) / 52) * 5;
      const fatherLoss = ((480_000 * 0.102) / 52) * 2;
      expect(result.breakdown.feriepengeDifference).toBeCloseTo(
        motherLoss + fatherLoss,
        2
      );
    });

    test('far uten uker bidrar ikke, selv om økonomi er oppgitt', () => {
      const result = calculate80Scenario(
        economy(),
        economy({ monthlySalary: 90_000, monthlyCommissionLoss: 5_000 }),
        20,
        0,
        NO_GAP
      );
      expect(result.breakdown.navPayout).toBeCloseTo((600_000 / 52) * 20 * 0.8, 2);
      expect(result.breakdown.commissionLoss).toBe(0);
    });

    test('far-økonomi uten uker kan fortsatt ta gapet hvis dagsatsen er lavest', () => {
      // Dokumenterer dagens oppførsel: gap-fordeling ser på fars lønn selv
      // om far ikke har uker i planen.
      const result = calculate80Scenario(
        economy({ monthlySalary: 60_000 }),
        economy({ monthlySalary: 30_000 }),
        20,
        0,
        TWO_WEEK_GAP
      );
      expect(result.breakdown.gapTakenBy).toBe('father');
    });
  });

  test('0 uker gir total 0 uten gap', () => {
    const result = calculate80Scenario(economy(), undefined, 0, 0, NO_GAP);
    expect(result.total).toBe(0);
  });

  test('total er navPayout - commissionLoss - gapCost - feriepengeDifference', () => {
    const result = calculate80Scenario(
      economy({ employerPaysFeriepenger: false, monthlyCommissionLoss: 2_000 }),
      economy({ monthlySalary: 45_000, employerPaysFeriepenger: false }),
      19,
      19,
      TWO_WEEK_GAP
    );
    const b = result.breakdown;
    expect(result.total).toBeCloseTo(
      b.navPayout - b.commissionLoss - b.gapCost - b.feriepengeDifference,
      6
    );
  });
});
