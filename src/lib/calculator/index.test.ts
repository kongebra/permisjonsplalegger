import { describe, test, expect } from 'bun:test';
import {
  getDefaultDaycareStart,
  getDefaultSharedWeeksToMother,
  calculate,
  calculateLeave,
} from './index';
import { LEAVE_CONFIG } from '../constants';
import type { ParentEconomy } from '../types';

// ============================================================
// Default daycare start
// ============================================================
describe('getDefaultDaycareStart', () => {
  test('born before august: daycare next year aug 1', () => {
    const dueDate = new Date(2026, 6, 5); // July 5, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(1);
  });

  test('born after august: daycare 2 years later aug 1', () => {
    const dueDate = new Date(2026, 8, 15); // Sept 15, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(1);
  });

  test('born on august 1: daycare next year aug 1', () => {
    const dueDate = new Date(2026, 7, 1); // Aug 1, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
  });

  test('born on august 31: daycare next year aug 1', () => {
    const dueDate = new Date(2026, 7, 31); // Aug 31, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
  });

  test('born in september: daycare 2 years later aug 1', () => {
    const dueDate = new Date(2026, 8, 1); // Sept 1, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(7);
  });

  test('born in december: daycare 2 years later aug 1', () => {
    const dueDate = new Date(2026, 11, 15); // Dec 15, 2026
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(7);
  });

  test('born in january: daycare same year + 1 aug', () => {
    const dueDate = new Date(2027, 0, 15); // Jan 15, 2027
    const result = getDefaultDaycareStart(dueDate);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(7);
  });
});

// ============================================================
// NAV periodedata – sjekk at konstantene stemmer med nav.no
// ============================================================
describe('LEAVE_CONFIG vs NAV-dokumentasjon', () => {
  test('100% total er 49 uker', () => {
    expect(LEAVE_CONFIG[100].total).toBe(49);
  });

  test('100% fellesperiode er 16 uker', () => {
    expect(LEAVE_CONFIG[100].shared).toBe(16);
  });

  test('80% total er 61 uker (fra NAV: 61 uker og 1 dag, avrundet)', () => {
    expect(LEAVE_CONFIG[80].total).toBe(61);
  });

  test('80% fellesperiode er 20 uker (fra NAV: 20 uker og 1 dag, avrundet)', () => {
    expect(LEAVE_CONFIG[80].shared).toBe(20);
  });
});

// ============================================================
// Default shared weeks
// ============================================================
describe('getDefaultSharedWeeksToMother', () => {
  test('100%: half of 16 = 8', () => {
    expect(getDefaultSharedWeeksToMother(100)).toBe(8);
  });

  test('80%: half of 20 = 10', () => {
    expect(getDefaultSharedWeeksToMother(80)).toBe(10);
  });
});

// ============================================================
// Integration: calculate()
// ============================================================
describe('calculate() integration', () => {
  const dueDate = new Date(2026, 6, 5);
  const daycareStartDate = new Date(2027, 7, 1);

  test('returns leave result without economy when no salary data', () => {
    const result = calculate({
      dueDate,
      coverage: 100,
      rights: 'both',
      sharedWeeksToMother: 8,
      overlapWeeks: 0,
      daycareStartDate,
      vacationWeeks: [],
    });
    expect(result.leave).toBeDefined();
    expect(result.economy).toBeUndefined();
  });

  test('returns economy when salary is provided', () => {
    const motherEconomy: ParentEconomy = {
      monthlySalary: 50_000,
      monthlyCommissionLoss: 0,
      employerCoversAbove6G: false,
      employerPaysFeriepenger: false,
    };

    const result = calculate({
      dueDate,
      coverage: 100,
      rights: 'both',
      sharedWeeksToMother: 8,
      overlapWeeks: 0,
      daycareStartDate,
      motherEconomy,
      vacationWeeks: [],
    });
    expect(result.leave).toBeDefined();
    expect(result.economy).toBeDefined();
    expect(result.economy!.scenario80).toBeDefined();
    expect(result.economy!.scenario100).toBeDefined();
  });

  test('leave result contains mother, father, gap', () => {
    const result = calculate({
      dueDate,
      coverage: 100,
      rights: 'both',
      sharedWeeksToMother: 8,
      overlapWeeks: 0,
      daycareStartDate,
      vacationWeeks: [],
    });

    expect(result.leave.mother.weeks).toBeGreaterThan(0);
    expect(result.leave.father.weeks).toBeGreaterThan(0);
    expect(result.leave.mother.weeks + result.leave.father.weeks).toBe(
      LEAVE_CONFIG[100].total
    );
  });

  test('mother-only: father weeks are 0', () => {
    const result = calculate({
      dueDate,
      coverage: 100,
      rights: 'mother-only',
      sharedWeeksToMother: 0,
      overlapWeeks: 0,
      daycareStartDate,
      vacationWeeks: [],
    });

    expect(result.leave.mother.weeks).toBe(LEAVE_CONFIG[100].total);
    expect(result.leave.father.weeks).toBe(0);
  });

  test('gap should exist when daycare is after leave end', () => {
    const result = calculate({
      dueDate,
      coverage: 100,
      rights: 'both',
      sharedWeeksToMother: 8,
      overlapWeeks: 0,
      daycareStartDate: new Date(2028, 7, 1), // Far in the future
      vacationWeeks: [],
    });

    expect(result.leave.gap.days).toBeGreaterThan(0);
  });
});

// ============================================================
// father-only scenario
// ============================================================
describe('father-only scenario', () => {
  const dueDate = new Date(2026, 9, 15); // 15. oktober 2026
  const daycareDate = new Date(2027, 7, 1); // 1. august 2027

  test('100%: total = 40 uker, starter på termindato', () => {
    const result = calculateLeave(dueDate, 100, 'father-only', 0, 0, daycareDate);
    expect(result.father.weeks).toBe(40);
    expect(result.father.start.getTime()).toBe(dueDate.getTime());
    expect(result.mother.weeks).toBe(0);
  });

  test('80%: total = 52 uker', () => {
    const result = calculateLeave(dueDate, 80, 'father-only', 0, 0, daycareDate);
    expect(result.father.weeks).toBe(52);
  });

  test('to segmenter: quota 10 uker + activity-required 30 uker (100%)', () => {
    const result = calculateLeave(dueDate, 100, 'father-only', 0, 0, daycareDate);
    const fatherSegs = result.segments.filter(s => s.parent === 'father');
    expect(fatherSegs).toHaveLength(2);
    expect(fatherSegs[0].type).toBe('quota');
    expect(fatherSegs[0].weeks).toBe(10);
    expect(fatherSegs[1].type).toBe('activity-required');
    expect(fatherSegs[1].weeks).toBe(30);
  });
});
