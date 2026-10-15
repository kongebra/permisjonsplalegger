import { describe, test, expect } from 'bun:test';
import {
  initializePeriodsFromLeave,
  reinitializePreservingUserPeriods,
} from './initialize-periods';
import type {
  CustomPeriod,
  LeaveResult,
  LeaveSegment,
  LeaveSegmentType,
  Parent,
} from '../types';

// Forventet oppførsel er hentet fra dokumentasjonen i initialize-periods.ts:
//   preBirth og mandatory -> låst permisjon
//   quota, shared, overlap -> redigerbar permisjon
//   vacation -> redigerbar ferie, unpaid -> redigerbar ulønnet
//   gap -> konverteres ikke

const d = (month: number, day: number) => new Date(2027, month - 1, day);

function segment(
  type: LeaveSegmentType,
  parent: Parent,
  start: Date,
  end: Date
): LeaveSegment {
  return { parent, type, start, end, weeks: 1 };
}

function leaveResult(segments: LeaveSegment[]): LeaveResult {
  const gapDate = d(8, 17);
  return {
    segments,
    mother: { start: d(1, 1), end: d(6, 1), weeks: 20 },
    father: { start: d(6, 1), end: d(8, 1), weeks: 8 },
    overlap: null,
    gap: { start: d(8, 1), end: gapDate, weeks: 3, days: 16, workDays: 11 },
    totalCalendarWeeks: 28,
    vacationDaysNeeded: { mother: 0, father: 0 },
  };
}

describe('initializePeriodsFromLeave', () => {
  test('tomt resultat gir ingen perioder', () => {
    expect(initializePeriodsFromLeave(leaveResult([]))).toEqual([]);
  });

  test('preBirth og mandatory blir låst permisjon', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('preBirth', 'mother', d(1, 1), d(1, 22)),
        segment('mandatory', 'mother', d(1, 22), d(3, 5)),
      ])
    );
    expect(periods).toHaveLength(2);
    for (const p of periods) {
      expect(p.type).toBe('permisjon');
      expect(p.isLocked).toBe(true);
      expect(p.isFromWizard).toBe(true);
      expect(p.parent).toBe('mother');
    }
    expect(periods.map((p) => p.segmentType)).toEqual(['preBirth', 'mandatory']);
  });

  test('quota, shared og overlap blir redigerbar permisjon', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('quota', 'mother', d(3, 5), d(5, 1)),
        segment('shared', 'mother', d(5, 1), d(6, 1)),
        segment('overlap', 'father', d(5, 15), d(5, 29)),
      ])
    );
    expect(periods.map((p) => p.type)).toEqual([
      'permisjon',
      'permisjon',
      'permisjon',
    ]);
    expect(periods.every((p) => p.isLocked === false)).toBe(true);
    expect(periods.map((p) => p.segmentType)).toEqual(['quota', 'shared', 'overlap']);
  });

  test('vacation blir ferie og unpaid blir ulønnet, begge redigerbare', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('vacation', 'father', d(6, 1), d(6, 15)),
        segment('unpaid', 'father', d(6, 15), d(7, 1)),
      ])
    );
    expect(periods.map((p) => p.type)).toEqual(['ferie', 'ulonnet']);
    expect(periods.every((p) => p.isLocked === false)).toBe(true);
    expect(periods.every((p) => p.isFromWizard === true)).toBe(true);
  });

  test('gap konverteres ikke', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('quota', 'mother', d(3, 5), d(5, 1)),
        segment('gap', 'mother', d(8, 1), d(8, 17)),
      ])
    );
    expect(periods).toHaveLength(1);
    expect(periods[0].segmentType).toBe('quota');
  });

  test('activity-required har ingen mapping og hoppes over', () => {
    // Dokumenterer dagens oppførsel: segmenttypen finnes i LeaveSegmentType,
    // men mangler i SEGMENT_TO_PERIOD_TYPE, så segmentet forsvinner stille.
    const periods = initializePeriodsFromLeave(
      leaveResult([segment('activity-required', 'father', d(3, 5), d(5, 1))])
    );
    expect(periods).toEqual([]);
  });

  test('start- og sluttdato (eksklusiv slutt) og forelder kopieres uendret', () => {
    const start = d(3, 5);
    const end = d(5, 1);
    const [p] = initializePeriodsFromLeave(
      leaveResult([segment('quota', 'father', start, end)])
    );
    expect(p.startDate).toEqual(start);
    expect(p.endDate).toEqual(end);
    expect(p.parent).toBe('father');
  });

  test('rekkefølgen fra segmentene bevares', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('quota', 'mother', d(3, 5), d(5, 1)),
        segment('gap', 'mother', d(8, 1), d(8, 17)),
        segment('vacation', 'mother', d(5, 1), d(5, 15)),
        segment('unpaid', 'father', d(5, 15), d(6, 1)),
      ])
    );
    expect(periods.map((p) => p.segmentType)).toEqual(['quota', 'vacation', 'unpaid']);
  });

  test('id-ene er unike og inneholder forelder og segmenttype', () => {
    const periods = initializePeriodsFromLeave(
      leaveResult([
        segment('quota', 'mother', d(3, 5), d(5, 1)),
        segment('quota', 'father', d(5, 1), d(6, 1)),
        segment('vacation', 'father', d(6, 1), d(6, 8)),
      ])
    );
    const ids = periods.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toContain('mother');
    expect(ids[0]).toContain('quota');
    expect(ids[2]).toContain('father');
    expect(ids[2]).toContain('vacation');
  });

  test('id-tellerens nullstilles for hvert kall (stabile id-er ved ny initialisering)', () => {
    const result = leaveResult([segment('quota', 'mother', d(3, 5), d(5, 1))]);
    const first = initializePeriodsFromLeave(result);
    const second = initializePeriodsFromLeave(result);
    expect(second.map((p) => p.id)).toEqual(first.map((p) => p.id));
  });
});

describe('reinitializePreservingUserPeriods', () => {
  const userPeriod: CustomPeriod = {
    id: 'user-1',
    type: 'ferie',
    parent: 'mother',
    startDate: d(7, 1),
    endDate: d(7, 15),
  };

  const oldWizardPeriod: CustomPeriod = {
    id: 'wizard-mother-quota-1',
    type: 'permisjon',
    parent: 'mother',
    startDate: d(1, 1),
    endDate: d(3, 1),
    isFromWizard: true,
    isLocked: false,
    segmentType: 'quota',
  };

  test('erstatter wizard-perioder og beholder brukerens perioder', () => {
    const result = reinitializePreservingUserPeriods(
      [oldWizardPeriod, userPeriod],
      leaveResult([segment('quota', 'mother', d(2, 1), d(4, 1))])
    );
    expect(result).toHaveLength(2);
    // Nye wizard-perioder kommer først, brukerperioder etterpå
    expect(result[0].isFromWizard).toBe(true);
    expect(result[0].startDate).toEqual(d(2, 1));
    expect(result[1]).toBe(userPeriod);
    expect(result.find((p) => p.id === oldWizardPeriod.id)?.startDate).toEqual(
      d(2, 1)
    );
  });

  test('gamle wizard-perioder som ikke finnes i nytt resultat fjernes', () => {
    const result = reinitializePreservingUserPeriods(
      [oldWizardPeriod, userPeriod],
      leaveResult([])
    );
    expect(result).toEqual([userPeriod]);
  });

  test('uten brukerperioder gis kun de nye wizard-periodene', () => {
    const result = reinitializePreservingUserPeriods(
      [oldWizardPeriod],
      leaveResult([segment('vacation', 'father', d(6, 1), d(6, 8))])
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('ferie');
    expect(result[0].parent).toBe('father');
  });

  test('tom nåværende liste gir kun nye wizard-perioder', () => {
    const result = reinitializePreservingUserPeriods(
      [],
      leaveResult([segment('quota', 'mother', d(2, 1), d(4, 1))])
    );
    expect(result).toHaveLength(1);
    expect(result[0].isFromWizard).toBe(true);
  });

  test('muterer ikke inndata-listen', () => {
    const current = [oldWizardPeriod, userPeriod];
    reinitializePreservingUserPeriods(current, leaveResult([]));
    expect(current).toEqual([oldWizardPeriod, userPeriod]);
  });
});
