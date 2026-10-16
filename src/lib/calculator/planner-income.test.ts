import { describe, test, expect } from 'bun:test';
import { calculatePlannerMonthlyIncome, getVacationLeaveOverlap, type PlannerIncomeInput } from './planner-income';
import { MAX_BASIS } from '../constants';
import type { CustomPeriod, ParentEconomy, PlannerPeriodType } from '../types';

// ============================================================
// Hjelpere
//
// Sluttdatoer er EKSKLUSIVE (dagen etter siste dag), som internt i appen.
// Forventede tall er regnet ut for hånd. November 2026 har 30 dager, og
// ferien 2.-13. november er 12 kalenderdager (sluttdato 14. november).
// ============================================================

const NOV_1 = new Date(2026, 10, 1);
const DEC_1 = new Date(2026, 11, 1);
const VACATION_START = new Date(2026, 10, 2);
const VACATION_END = new Date(2026, 10, 14);

function economy(monthlySalary: number): ParentEconomy {
  return { monthlySalary, monthlyCommissionLoss: 0, employerCoversAbove6G: false, employerPaysFeriepenger: false };
}

function period(
  id: string,
  type: PlannerPeriodType,
  start: Date,
  end: Date,
  extra: Partial<CustomPeriod> = {},
): CustomPeriod {
  return { id, type, parent: 'mother', startDate: start, endDate: end, ...extra };
}

const leave = period('leave', 'permisjon', NOV_1, DEC_1, { isFromWizard: true, segmentType: 'shared' });
const vacation = period('vacation', 'ferie', VACATION_START, VACATION_END);

function november(periods: CustomPeriod[], monthlySalary = 50_000) {
  const input: PlannerIncomeInput = {
    periods,
    rights: 'mother-only',
    coverage: 100,
    motherEconomy: economy(monthlySalary),
    fatherEconomy: economy(0),
    // Gapet ligger etter november og påvirker ikke måneden
    gap: { start: DEC_1, end: DEC_1 },
    daycareStartDate: null,
  };
  const months = calculatePlannerMonthlyIncome(input);
  expect(months).toHaveLength(1);
  return months[0];
}

// ============================================================
// Ferie over egen permisjon
// ============================================================

describe('Ferie over egen permisjon', () => {
  test('gir foreldrepenger og feriepenger, ikke lønn i stedet for foreldrepenger', () => {
    // 50 000 kr/mnd er under 6G: foreldrepenger 50 000 for hele november,
    // feriepenger 12/30 x 50 000 = 20 000
    const result = november([leave, vacation]);
    expect(result.navIncome).toBe(50_000);
    expect(result.employerIncome).toBe(20_000);
    expect(result.total).toBe(70_000);
  });

  test('gir samme resultat uansett rekkefølge på periodene', () => {
    expect(november([vacation, leave])).toEqual(november([leave, vacation]));
  });

  test('over 6G: foreldrepenger begrenses, feriepenger følger lønnen, uansett rekkefølge', () => {
    // Grunnlag 6G = 819 294 kr, foreldrepenger 819 294 / 12 = 68 274,5 -> 68 275.
    // Feriepenger 12/30 x 80 000 = 32 000. Sum 100 275.
    expect(MAX_BASIS).toBe(819_294);
    for (const periods of [[leave, vacation], [vacation, leave]]) {
      const result = november(periods, 80_000);
      expect(result.navIncome).toBe(68_275);
      expect(result.employerIncome).toBe(32_000);
      expect(result.total).toBe(100_275);
    }
  });

  test('ferie over de seks obligatoriske ukene gir bare foreldrepenger', () => {
    // NAV: de første 6 ukene etter fødsel kan ikke kombineres med ferie
    const mandatory = period('mandatory', 'permisjon', NOV_1, DEC_1, {
      isFromWizard: true,
      isLocked: true,
      segmentType: 'mandatory',
    });
    for (const periods of [[mandatory, vacation], [vacation, mandatory]]) {
      const result = november(periods);
      expect(result.navIncome).toBe(50_000);
      expect(result.employerIncome).toBe(0);
    }
  });
});

// ============================================================
// Andre overlapp: permisjon vinner over ulønnet og annet
// ============================================================

describe('Overlapp uten ferie', () => {
  test.each(['ulonnet', 'annet'] as const)('%s over permisjon gir foreldrepenger, uansett rekkefølge', (type) => {
    const other = period('other', type, VACATION_START, VACATION_END);
    for (const periods of [[leave, other], [other, leave]]) {
      const result = november(periods);
      expect(result.navIncome).toBe(50_000);
      expect(result.employerIncome).toBe(0);
    }
  });

  test('ferie over ulønnet permisjon gir feriepenger, uansett rekkefølge', () => {
    // Ulønnet hele november, ferie 12 dager: 12/30 x 50 000 = 20 000
    const unpaid = period('unpaid', 'ulonnet', NOV_1, DEC_1);
    for (const periods of [[unpaid, vacation], [vacation, unpaid]]) {
      const result = november(periods);
      expect(result.navIncome).toBe(0);
      expect(result.employerIncome).toBe(20_000);
    }
  });

  test('ferie alene gir feriepenger, resten av måneden lønn', () => {
    // 12 dager feriepenger + 18 dager lønn = hele månedslønnen
    const result = november([vacation]);
    expect(result.navIncome).toBe(0);
    expect(result.employerIncome).toBe(50_000);
  });
});

// ============================================================
// Klokkeslett i datoene
// ============================================================

test('en periode som starter midt på dagen teller hele dagen', () => {
  // Datoer fra veiviseren kan ha klokkeslett. 1. november kl. 10 skal
  // regnes som permisjonsdag, ikke lønnsdag.
  const fromTen = period('leave', 'permisjon', new Date(2026, 10, 1, 10), new Date(2026, 11, 1, 10));
  const result = november([fromTen]);
  expect(result.navIncome).toBe(50_000);
  expect(result.employerIncome).toBe(0);
});

// ============================================================
// Varsel i periodedialogen
// ============================================================

describe('getVacationLeaveOverlap', () => {
  const mandatory = period('mandatory', 'permisjon', new Date(2026, 9, 1), NOV_1, { segmentType: 'mandatory' });
  const periods = [mandatory, leave];

  test('ingen overlapp før eller etter permisjonen', () => {
    expect(getVacationLeaveOverlap(periods, 'mother', DEC_1, new Date(2026, 11, 8))).toBe('none');
  });

  test('ingen overlapp med den andre forelderens permisjon', () => {
    expect(getVacationLeaveOverlap(periods, 'father', VACATION_START, VACATION_END)).toBe('none');
  });

  test('overlapp med egen permisjon', () => {
    expect(getVacationLeaveOverlap(periods, 'mother', VACATION_START, VACATION_END)).toBe('leave');
  });

  test('overlapp med de obligatoriske ukene går foran vanlig overlapp', () => {
    // 25. oktober til og med 5. november treffer begge
    expect(getVacationLeaveOverlap(periods, 'mother', new Date(2026, 9, 25), new Date(2026, 10, 6))).toBe('mandatory');
  });

  test('perioden som redigeres teller ikke mot seg selv', () => {
    // En permisjon som endres til ferie skal ikke varsle om overlapp med seg selv
    expect(getVacationLeaveOverlap([leave], 'mother', VACATION_START, VACATION_END, 'leave')).toBe('none');
  });

  test('sluttdatoen er eksklusiv: ferie som slutter der permisjonen starter overlapper ikke', () => {
    expect(getVacationLeaveOverlap([leave], 'mother', new Date(2026, 9, 20), NOV_1)).toBe('none');
  });
});
