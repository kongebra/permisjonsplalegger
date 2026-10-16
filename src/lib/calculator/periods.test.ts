import { describe, test, expect } from 'bun:test';
import {
  calculateVacationDaysNeeded,
  daysBetween,
  weeksBetween,
} from './dates';
import type { VacationWeek } from '../types';

// ============================================================
// Hjelpere
//
// Alle sluttdatoer i testene er EKSKLUSIVE (dagen etter siste permisjonsdag),
// slik prosjektet bruker dem internt (se CLAUDE.md).
//
// Datoene ligger i 2027 (februar til september). Tidsomstillingene er
// dekket av egne tester nederst i filen.
//
// Forventede verdier er regnet ut for hånd fra kalenderen, ikke hentet fra
// funksjonenes output.
// ============================================================

// Mandag 1. februar 2027
const MON = new Date(2027, 1, 1);

/** Dato n uker etter mandag 1. februar 2027 */
function weeksAfterMon(weeks: number): Date {
  return new Date(2027, 1, 1 + weeks * 7);
}

// ============================================================
// calculateVacationDaysNeeded
// ============================================================
describe('calculateVacationDaysNeeded', () => {
  const gap = { start: MON, end: weeksAfterMon(3), weeks: 3, days: 21, workDays: 15 };

  test('ingen ferieuker gir 0 dager', () => {
    expect(calculateVacationDaysNeeded(gap, [])).toEqual({ mother: 0, father: 0 });
  });

  test('hver ferieuke teller 5 arbeidsdager per forelder', () => {
    const weeks: VacationWeek[] = [
      { parent: 'mother', weekIndex: 1 },
      { parent: 'mother', weekIndex: 2 },
      { parent: 'father', weekIndex: 3 },
    ];
    expect(calculateVacationDaysNeeded(gap, weeks)).toEqual({
      mother: 10,
      father: 5,
    });
  });

  test('kun far har ferieuker', () => {
    const weeks: VacationWeek[] = [
      { parent: 'father', weekIndex: 1 },
      { parent: 'father', weekIndex: 2 },
    ];
    expect(calculateVacationDaysNeeded(gap, weeks)).toEqual({
      mother: 0,
      father: 10,
    });
  });
});

// ============================================================
// Tidsomstilling (vinter-/sommertid)
// ============================================================
describe('daysBetween ved overgang til vintertid', () => {
  // I Europe/Oslo er døgnet ved overgang til vintertid (siste søndag i
  // oktober, 25. oktober 2026) 25 timer langt. Dagsdifferansen må derfor
  // regnes i kalenderdager, ikke millisekunder, ellers blir antall dager
  // (og uker) én for høyt når planen krysser tidsomstillingen.
  test('daysBetween gir 14 dager mellom 20. okt og 3. nov 2026', () => {
    expect(daysBetween(new Date(2026, 9, 20), new Date(2026, 10, 3))).toBe(14);
  });
  test('weeksBetween gir 2 uker mellom 20. okt og 3. nov 2026', () => {
    expect(weeksBetween(new Date(2026, 9, 20), new Date(2026, 10, 3))).toBe(2);
  });
  test('daysBetween er riktig over overgang til sommertid (28. mars 2027)', () => {
    expect(daysBetween(new Date(2027, 2, 20), new Date(2027, 3, 3))).toBe(14);
  });
  test('daysBetween ignorerer klokkeslett og gir negativt tall bakover', () => {
    expect(daysBetween(new Date(2026, 9, 20, 18), new Date(2026, 10, 3, 6))).toBe(14);
    expect(daysBetween(new Date(2026, 10, 3), new Date(2026, 9, 20))).toBe(-14);
  });

  test('sanity: ordinær periode uten tidsomstilling gir hele dager', () => {
    expect(daysBetween(new Date(2027, 1, 1), new Date(2027, 1, 15))).toBe(14);
    expect(weeksBetween(new Date(2027, 1, 1), new Date(2027, 1, 15))).toBe(2);
  });
});
