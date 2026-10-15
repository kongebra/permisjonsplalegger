import { describe, test, expect } from 'bun:test';
import {
  calculateVacationDaysNeeded,
  buildSegmentsFromPeriods,
  calculateGapFromPeriods,
  daysBetween,
  weeksBetween,
} from './dates';
import type {
  LeavePeriod,
  LeavePeriodType,
  Parent,
  ParentPeriodConfig,
  VacationWeek,
} from '../types';

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

let nextId = 0;

function period(
  parent: Parent,
  type: LeavePeriodType,
  startDate: Date,
  endDate: Date
): LeavePeriod {
  return { id: `p-${++nextId}`, parent, type, startDate, endDate };
}

function config(periods: LeavePeriod[]): ParentPeriodConfig {
  return { jobType: 'office', periods };
}

const EMPTY = config([]);

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
// buildSegmentsFromPeriods
// ============================================================
describe('buildSegmentsFromPeriods', () => {
  test('tom plan gir ingen segmenter', () => {
    expect(buildSegmentsFromPeriods(EMPTY, EMPTY)).toEqual([]);
  });

  test('periodetyper mappes til samme segmenttype', () => {
    const mother = config([
      period('mother', 'quota', MON, weeksAfterMon(2)),
      period('mother', 'shared', weeksAfterMon(2), weeksAfterMon(4)),
      period('mother', 'vacation', weeksAfterMon(4), weeksAfterMon(5)),
      period('mother', 'unpaid', weeksAfterMon(5), weeksAfterMon(6)),
    ]);
    const segments = buildSegmentsFromPeriods(mother, EMPTY);
    expect(segments.map((s) => s.type)).toEqual([
      'quota',
      'shared',
      'vacation',
      'unpaid',
    ]);
    expect(segments.every((s) => s.parent === 'mother')).toBe(true);
  });

  test('start og slutt kopieres uendret (eksklusiv slutt), og uker beregnes', () => {
    const mother = config([period('mother', 'quota', MON, weeksAfterMon(15))]);
    const [segment] = buildSegmentsFromPeriods(mother, EMPTY);
    expect(segment.start).toEqual(MON);
    expect(segment.end).toEqual(weeksAfterMon(15));
    expect(segment.weeks).toBe(15);
  });

  test('segmenter fra begge foreldre slås sammen og sorteres på startdato', () => {
    const mother = config([
      period('mother', 'quota', MON, weeksAfterMon(4)),
      period('mother', 'vacation', weeksAfterMon(12), weeksAfterMon(13)),
    ]);
    const father = config([
      period('father', 'quota', weeksAfterMon(4), weeksAfterMon(8)),
      period('father', 'vacation', weeksAfterMon(10), weeksAfterMon(11)),
    ]);
    const segments = buildSegmentsFromPeriods(mother, father);
    expect(segments.map((s) => [s.parent, s.type])).toEqual([
      ['mother', 'quota'],
      ['father', 'quota'],
      ['father', 'vacation'],
      ['mother', 'vacation'],
    ]);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start.getTime()).toBeGreaterThanOrEqual(
        segments[i - 1].start.getTime()
      );
    }
  });

  test('perioder i usortert rekkefølge sorteres', () => {
    const mother = config([
      period('mother', 'vacation', weeksAfterMon(6), weeksAfterMon(7)),
      period('mother', 'quota', MON, weeksAfterMon(6)),
    ]);
    const segments = buildSegmentsFromPeriods(mother, EMPTY);
    expect(segments.map((s) => s.type)).toEqual(['quota', 'vacation']);
  });

  test('delvis uke rundes opp til hel uke', () => {
    // 10 dager = 1,43 uker -> 2
    const mother = config([
      period('mother', 'vacation', MON, new Date(2027, 1, 11)),
    ]);
    expect(buildSegmentsFromPeriods(mother, EMPTY)[0].weeks).toBe(2);
  });
});

// ============================================================
// calculateGapFromPeriods
// ============================================================
describe('calculateGapFromPeriods', () => {
  // Barnehagestart 17. august 2027
  const daycare = new Date(2027, 7, 17);

  test('uten perioder er gapet 0 og start/slutt er barnehagestart', () => {
    expect(calculateGapFromPeriods(EMPTY, EMPTY, daycare)).toEqual({
      start: daycare,
      end: daycare,
      weeks: 0,
      days: 0,
      workDays: 0,
    });
  });

  test('gapet starter på eksklusiv sluttdato (dagen etter siste permisjonsdag)', () => {
    // Siste permisjonsdag er 31. juli, eksklusiv slutt er 1. august
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 7, 1)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.start).toEqual(new Date(2027, 7, 1));
    expect(gap.end).toEqual(daycare);
    // 1. aug til 17. aug = 16 dager (1.-16. august ligger i gapet)
    expect(gap.days).toBe(16);
    expect(gap.weeks).toBe(3); // ceil(16 / 7)
  });

  test('permisjon som slutter dagen før barnehagestart gir 1 dags gap', () => {
    // Siste permisjonsdag 16. aug, eksklusiv slutt 17. aug = barnehagestart
    // betyr ingen gap. Siste dag 15. aug (slutt 16. aug) gir 1 dag.
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 7, 16)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.days).toBe(1);
    expect(gap.weeks).toBe(1);
  });

  test('eksklusiv slutt lik barnehagestart gir ingen gap', () => {
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), daycare),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
  });

  test('permisjon som varer etter barnehagestart gir 0, aldri negativt gap', () => {
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 8, 14)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
    expect(gap.start).toEqual(new Date(2027, 8, 14));
  });

  test('gapet regnes fra seneste slutt på tvers av foreldre', () => {
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 5, 1)),
    ]);
    const father = config([
      period('father', 'quota', new Date(2027, 5, 1), new Date(2027, 7, 3)),
    ]);
    const gap = calculateGapFromPeriods(mother, father, daycare);
    expect(gap.start).toEqual(new Date(2027, 7, 3));
    expect(gap.days).toBe(14);
    expect(gap.weeks).toBe(2);
  });

  test('seneste slutt finnes uavhengig av rekkefølge', () => {
    const mother = config([
      period('mother', 'vacation', new Date(2027, 6, 1), new Date(2027, 6, 15)),
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 5, 1)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.start).toEqual(new Date(2027, 6, 15));
    expect(gap.days).toBe(33);
  });

  test('ferie og ulønnet permisjon dekker gapet (teller som periode)', () => {
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 6, 1)),
      period('mother', 'vacation', new Date(2027, 6, 1), new Date(2027, 7, 10)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.start).toEqual(new Date(2027, 7, 10));
    expect(gap.days).toBe(7);
    expect(gap.weeks).toBe(1);
  });

  test('uker rundes opp: 8 dager gir 2 uker', () => {
    const mother = config([
      period('mother', 'quota', new Date(2027, 1, 1), new Date(2027, 7, 9)),
    ]);
    const gap = calculateGapFromPeriods(mother, EMPTY, daycare);
    expect(gap.days).toBe(8);
    expect(gap.weeks).toBe(2);
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
