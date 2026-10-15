import { describe, test, expect } from 'bun:test';
import {
  calculateVacationDaysNeeded,
  calculateQuotaUsage,
  validatePeriods,
  buildSegmentsFromPeriods,
  calculateGapFromPeriods,
  daysBetween,
  weeksBetween,
} from './dates';
import { LEAVE_CONFIG } from '../constants';
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
// Forventede verdier er regnet ut for hånd fra LEAVE_CONFIG (NAV-kvoter i
// docs/nav/foreldrepenger.md: 100 % = 15 + 15 + 16 uker, 80 % = 19 + 19 + 20)
// og kalenderen, ikke hentet fra funksjonenes output.
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
  const gap = { start: MON, end: weeksAfterMon(3), weeks: 3, days: 21 };

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
// calculateQuotaUsage
// ============================================================
describe('calculateQuotaUsage', () => {
  test('tom plan gir 0 uker brukt og ingen overbooking (begge, 100 %)', () => {
    const usage = calculateQuotaUsage(EMPTY, EMPTY, 100, 'both');
    expect(usage).toEqual([
      { type: 'mother', weeksUsed: 0, weeksAvailable: 15, isOverbooked: false },
      { type: 'father', weeksUsed: 0, weeksAvailable: 15, isOverbooked: false },
      { type: 'shared', weeksUsed: 0, weeksAvailable: 16, isOverbooked: false },
    ]);
  });

  test('tilgjengelige uker følger dekningsgrad (80 %: 19 + 19 + 20)', () => {
    const usage = calculateQuotaUsage(EMPTY, EMPTY, 80, 'both');
    expect(usage.map((u) => u.weeksAvailable)).toEqual([19, 19, 20]);
    expect(usage.map((u) => u.weeksAvailable)).toEqual([
      LEAVE_CONFIG[80].mother,
      LEAVE_CONFIG[80].father,
      LEAVE_CONFIG[80].shared,
    ]);
  });

  test('15 uker mødrekvote (eksklusiv slutt) bruker nøyaktig kvoten', () => {
    // 1. feb 2027 til 17. mai 2027 (eksklusiv) = 105 dager = 15 uker
    const mother = config([period('mother', 'quota', MON, weeksAfterMon(15))]);
    const [m] = calculateQuotaUsage(mother, EMPTY, 100, 'both');
    expect(m.weeksUsed).toBe(15);
    expect(m.isOverbooked).toBe(false);
  });

  test('16 uker mødrekvote er overbooket i 100 %, men ikke i 80 %', () => {
    const mother = config([period('mother', 'quota', MON, weeksAfterMon(16))]);
    const at100 = calculateQuotaUsage(mother, EMPTY, 100, 'both');
    expect(at100[0]).toEqual({
      type: 'mother',
      weeksUsed: 16,
      weeksAvailable: 15,
      isOverbooked: true,
    });
    const at80 = calculateQuotaUsage(mother, EMPTY, 80, 'both');
    expect(at80[0].isOverbooked).toBe(false);
  });

  test('en ekstra dag over kvoten rundes opp til en ekstra uke', () => {
    // 106 dager = 15,14 uker, rundes opp til 16 (weeksBetween bruker ceil)
    const end = new Date(2027, 1, 1 + 106);
    const mother = config([period('mother', 'quota', MON, end)]);
    const [m] = calculateQuotaUsage(mother, EMPTY, 100, 'both');
    expect(m.weeksUsed).toBe(16);
    expect(m.isOverbooked).toBe(true);
  });

  test('fedrekvote telles for far', () => {
    const father = config([period('father', 'quota', MON, weeksAfterMon(10))]);
    const usage = calculateQuotaUsage(EMPTY, father, 100, 'both');
    expect(usage.find((u) => u.type === 'father')).toEqual({
      type: 'father',
      weeksUsed: 10,
      weeksAvailable: 15,
      isOverbooked: false,
    });
  });

  test('fellesperiode summeres på tvers av begge foreldre', () => {
    const mother = config([period('mother', 'shared', MON, weeksAfterMon(10))]);
    const father = config([
      period('father', 'shared', weeksAfterMon(10), weeksAfterMon(17)),
    ]);
    const usage = calculateQuotaUsage(mother, father, 100, 'both');
    const shared = usage.find((u) => u.type === 'shared')!;
    expect(shared.weeksUsed).toBe(17); // 10 + 7
    expect(shared.weeksAvailable).toBe(16);
    expect(shared.isOverbooked).toBe(true);
  });

  test('flere perioder av samme type summeres', () => {
    const mother = config([
      period('mother', 'quota', MON, weeksAfterMon(6)),
      period('mother', 'quota', weeksAfterMon(10), weeksAfterMon(19)),
    ]);
    const [m] = calculateQuotaUsage(mother, EMPTY, 100, 'both');
    expect(m.weeksUsed).toBe(15); // 6 + 9
    expect(m.isOverbooked).toBe(false);
  });

  test('ferie og ulønnet permisjon teller ikke mot kvotene', () => {
    const mother = config([
      period('mother', 'vacation', MON, weeksAfterMon(4)),
      period('mother', 'unpaid', weeksAfterMon(4), weeksAfterMon(8)),
    ]);
    const usage = calculateQuotaUsage(mother, EMPTY, 100, 'both');
    expect(usage.map((u) => u.weeksUsed)).toEqual([0, 0, 0]);
  });

  test('kvotetype avgjøres av periodens type, ikke av hvilken forelder som har perioden', () => {
    // Fellesperiode i fars config telles som fellesperiode, ikke fedrekvote
    const father = config([period('father', 'shared', MON, weeksAfterMon(4))]);
    const usage = calculateQuotaUsage(EMPTY, father, 100, 'both');
    expect(usage.find((u) => u.type === 'father')!.weeksUsed).toBe(0);
    expect(usage.find((u) => u.type === 'shared')!.weeksUsed).toBe(4);
  });

  test('rights mother-only gir kun mor-rad (ingen far, ingen fellesperiode)', () => {
    const usage = calculateQuotaUsage(EMPTY, EMPTY, 100, 'mother-only');
    expect(usage.map((u) => u.type)).toEqual(['mother']);
  });

  test('rights father-only gir kun far-rad (ingen mor, ingen fellesperiode)', () => {
    const usage = calculateQuotaUsage(EMPTY, EMPTY, 100, 'father-only');
    expect(usage.map((u) => u.type)).toEqual(['father']);
  });
});

// ============================================================
// validatePeriods
// ============================================================
describe('validatePeriods', () => {
  // Termin 5. juli 2027 (mandag), plan starter 3 uker før
  const dueDate = new Date(2027, 6, 5);
  const threeWeeksBefore = new Date(2027, 5, 14);

  test('tom plan er gyldig uten advarsler', () => {
    expect(validatePeriods(EMPTY, EMPTY, 100, 'both', dueDate)).toEqual({
      isValid: true,
      warnings: [],
      errors: [],
    });
  });

  test('gyldig plan: mødrekvote fra 3 uker før termin, deretter fedrekvote', () => {
    const mother = config([
      period('mother', 'quota', threeWeeksBefore, weeksAfterDue(dueDate, 12)),
    ]);
    const father = config([
      period('father', 'quota', weeksAfterDue(dueDate, 12), weeksAfterDue(dueDate, 27)),
    ]);
    const result = validatePeriods(mother, father, 100, 'both', dueDate);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  describe('kvote-overbooking', () => {
    test('mødrekvote overskredet gir advarsel med antall uker', () => {
      const mother = config([period('mother', 'quota', MON, weeksAfterMon(16))]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', MON);
      expect(result.warnings).toContain('Mødrekvote er overskredet: 16 av 15 uker');
      // Overbooking er en advarsel, ikke en feil
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('fedrekvote overskredet gir advarsel', () => {
      const father = config([period('father', 'quota', MON, weeksAfterMon(17))]);
      const result = validatePeriods(EMPTY, father, 100, 'both', MON);
      expect(result.warnings).toContain('Fedrekvote er overskredet: 17 av 15 uker');
    });

    test('fellesperiode overskredet gir advarsel', () => {
      const mother = config([period('mother', 'shared', MON, weeksAfterMon(18))]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', MON);
      expect(result.warnings).toContain('Fellesperiode er overskredet: 18 av 16 uker');
    });

    test('80 %-kvoter brukes ved dekningsgrad 80', () => {
      const mother = config([period('mother', 'quota', MON, weeksAfterMon(19))]);
      const ok = validatePeriods(mother, EMPTY, 80, 'both', MON);
      expect(ok.warnings).toEqual([]);

      const tooLong = config([period('mother', 'quota', MON, weeksAfterMon(20))]);
      const over = validatePeriods(tooLong, EMPTY, 80, 'both', MON);
      expect(over.warnings).toContain('Mødrekvote er overskredet: 20 av 19 uker');
    });
  });

  describe('overlapp innen samme forelder', () => {
    test('overlappende perioder gir feil og ugyldig plan', () => {
      const mother = config([
        period('mother', 'quota', MON, weeksAfterMon(6)),
        period('mother', 'vacation', weeksAfterMon(5), weeksAfterMon(8)),
      ]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', MON);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Noen perioder overlapper for samme forelder']);
    });

    test('sammenhengende perioder (slutt = neste start, eksklusiv slutt) overlapper ikke', () => {
      const mother = config([
        period('mother', 'quota', MON, weeksAfterMon(6)),
        period('mother', 'vacation', weeksAfterMon(6), weeksAfterMon(8)),
      ]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', MON);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('én dag overlapp oppdages', () => {
      const mother = config([
        period('mother', 'quota', MON, weeksAfterMon(6)),
        period('mother', 'vacation', new Date(2027, 1, 1 + 41), weeksAfterMon(8)),
      ]);
      expect(validatePeriods(mother, EMPTY, 100, 'both', MON).isValid).toBe(false);
    });

    test('overlapp oppdages uavhengig av rekkefølgen perioder er lagt inn', () => {
      const mother = config([
        period('mother', 'vacation', weeksAfterMon(5), weeksAfterMon(8)),
        period('mother', 'quota', MON, weeksAfterMon(6)),
      ]);
      expect(validatePeriods(mother, EMPTY, 100, 'both', MON).isValid).toBe(false);
    });

    test('overlapp for far gir også feil', () => {
      const father = config([
        period('father', 'quota', MON, weeksAfterMon(6)),
        period('father', 'unpaid', weeksAfterMon(3), weeksAfterMon(9)),
      ]);
      expect(validatePeriods(EMPTY, father, 100, 'both', MON).isValid).toBe(false);
    });

    test('overlapp mellom mor og far er lov (egen overlappsperiode)', () => {
      const mother = config([period('mother', 'shared', MON, weeksAfterMon(6))]);
      const father = config([
        period('father', 'shared', weeksAfterMon(4), weeksAfterMon(8)),
      ]);
      const result = validatePeriods(mother, father, 100, 'both', MON);
      expect(result.errors).toEqual([]);
      expect(result.isValid).toBe(true);
    });
  });

  describe('perioder før termin', () => {
    const msg = 'Noen perioder starter mer enn 3 uker før termin';

    test('far som starter mer enn 3 uker før termin gir advarsel', () => {
      const father = config([
        period('father', 'quota', new Date(2027, 5, 7), weeksAfterDue(dueDate, 4)),
      ]);
      // 7. juni til 5. juli = 28 dager = 4 uker
      const result = validatePeriods(EMPTY, father, 100, 'both', dueDate);
      expect(result.warnings).toContain(msg);
      expect(result.isValid).toBe(true);
    });

    test('far som starter nøyaktig 3 uker før termin gir ikke advarsel', () => {
      const father = config([
        period('father', 'quota', threeWeeksBefore, weeksAfterDue(dueDate, 4)),
      ]);
      const result = validatePeriods(EMPTY, father, 100, 'both', dueDate);
      expect(result.warnings).not.toContain(msg);
    });

    test('3 uker og 1 dag før termin gir advarsel (uker rundes opp)', () => {
      const father = config([
        period('father', 'quota', new Date(2027, 5, 13), weeksAfterDue(dueDate, 4)),
      ]);
      const result = validatePeriods(EMPTY, father, 100, 'both', dueDate);
      expect(result.warnings).toContain(msg);
    });

    test('mødrekvote er unntatt og kan starte tidlig', () => {
      const mother = config([
        period('mother', 'quota', new Date(2027, 4, 1), weeksAfterDue(dueDate, 12)),
      ]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', dueDate);
      expect(result.warnings).not.toContain(msg);
    });

    test('mors fellesperiode er ikke unntatt', () => {
      const mother = config([
        period('mother', 'shared', new Date(2027, 4, 1), weeksAfterDue(dueDate, 4)),
      ]);
      const result = validatePeriods(mother, EMPTY, 100, 'both', dueDate);
      expect(result.warnings).toContain(msg);
    });

    test('perioder etter termin gir ingen advarsel', () => {
      const father = config([
        period('father', 'quota', weeksAfterDue(dueDate, 10), weeksAfterDue(dueDate, 20)),
      ]);
      const result = validatePeriods(EMPTY, father, 100, 'both', dueDate);
      expect(result.warnings).toEqual([]);
    });

    test('advarselen gis kun én gang selv med flere tidlige perioder', () => {
      const father = config([
        period('father', 'quota', new Date(2027, 4, 1), new Date(2027, 4, 15)),
        period('father', 'vacation', new Date(2027, 4, 15), new Date(2027, 4, 29)),
      ]);
      const result = validatePeriods(EMPTY, father, 100, 'both', dueDate);
      expect(result.warnings.filter((w) => w === msg)).toHaveLength(1);
    });
  });

  test('advarsler og feil kan forekomme samtidig', () => {
    const mother = config([
      period('mother', 'quota', MON, weeksAfterMon(16)),
      period('mother', 'vacation', weeksAfterMon(10), weeksAfterMon(12)),
    ]);
    const result = validatePeriods(mother, EMPTY, 100, 'both', MON);
    expect(result.warnings).toContain('Mødrekvote er overskredet: 16 av 15 uker');
    expect(result.errors).toHaveLength(1);
    expect(result.isValid).toBe(false);
  });
});

/** Dato n uker etter en gitt dato */
function weeksAfterDue(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}

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
