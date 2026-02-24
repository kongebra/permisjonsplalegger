import { describe, test, expect } from 'bun:test';
import {
  addDays,
  addWeeks,
  subtractWeeks,
  daysBetween,
  weeksBetween,
  calculateLeaveStart,
  calculateMotherPeriod,
  calculateFatherPeriod,
  calculateGap,
} from './dates';
import { LEAVE_CONFIG } from '../constants';

// ============================================================
// Date utility functions
// ============================================================
describe('addDays', () => {
  test('adds positive days', () => {
    const date = new Date(2026, 6, 5); // 5. juli 2026
    const result = addDays(date, 10);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(6);
  });

  test('handles month boundary', () => {
    const date = new Date(2026, 6, 28); // 28. juli
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(7); // august
  });

  test('does not mutate original date', () => {
    const date = new Date(2026, 6, 5);
    const original = date.getTime();
    addDays(date, 10);
    expect(date.getTime()).toBe(original);
  });
});

describe('daysBetween / weeksBetween', () => {
  test('calculates days between dates', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 8);
    expect(daysBetween(start, end)).toBe(7);
  });

  test('calculates weeks between dates', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 15);
    expect(weeksBetween(start, end)).toBe(2);
  });

  test('rounds weeks up', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 10); // 9 days = ceil(9/7) = 2 weeks
    expect(weeksBetween(start, end)).toBe(2);
  });
});

// ============================================================
// Leave period calculations
// ============================================================
describe('calculateLeaveStart', () => {
  test('starts 3 weeks before due date for 100%', () => {
    const dueDate = new Date(2026, 6, 5); // 5. juli 2026
    const start = calculateLeaveStart(dueDate, 100);
    const expected = subtractWeeks(dueDate, LEAVE_CONFIG[100].preBirth);
    expect(start.getTime()).toBe(expected.getTime());
  });

  test('starts 3 weeks before due date for 80%', () => {
    const dueDate = new Date(2026, 6, 5);
    const start = calculateLeaveStart(dueDate, 80);
    const expected = subtractWeeks(dueDate, LEAVE_CONFIG[80].preBirth);
    expect(start.getTime()).toBe(expected.getTime());
  });
});

describe('calculateMotherPeriod', () => {
  const dueDate = new Date(2026, 6, 5); // 5. juli 2026
  const leaveStart = calculateLeaveStart(dueDate, 100);

  test('both parents: mother gets preBirth + motherQuota + sharedWeeks', () => {
    const shared = 8; // Half of 16
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, shared, 'both');
    const expectedWeeks = LEAVE_CONFIG[100].preBirth + LEAVE_CONFIG[100].mother + shared;
    expect(result.weeks).toBe(expectedWeeks); // 3 + 15 + 8 = 26
  });

  test('mother-only: gets all weeks', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'mother-only');
    expect(result.weeks).toBe(LEAVE_CONFIG[100].total); // 49
  });

  test('father-only: mother gets 0 weeks', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'father-only');
    expect(result.weeks).toBe(0);
  });

  test('80%: mother gets more weeks with larger shared pool', () => {
    const shared80 = 9; // Half of 18
    const result = calculateMotherPeriod(leaveStart, dueDate, 80, shared80, 'both');
    const expectedWeeks = LEAVE_CONFIG[80].preBirth + LEAVE_CONFIG[80].mother + shared80;
    expect(result.weeks).toBe(expectedWeeks); // 3 + 19 + 9 = 31
  });

  test('end date = start + weeks * 7 days', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 8, 'both');
    const expectedEnd = addWeeks(leaveStart, result.weeks);
    expect(result.end.getTime()).toBe(expectedEnd.getTime());
  });

  test('father-only: mother start and end both equal dueDate', () => {
    const dueDate = new Date(2026, 6, 5);
    const leaveStart = calculateLeaveStart(dueDate, 100);
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'father-only');
    expect(result.weeks).toBe(0);
    expect(result.start.getTime()).toBe(dueDate.getTime()); // Not leaveStart!
    expect(result.end.getTime()).toBe(dueDate.getTime());
  });
});

describe('calculateFatherPeriod', () => {
  const dueDate = new Date(2026, 6, 5);
  const leaveStart = calculateLeaveStart(dueDate, 100);
  const motherResult = calculateMotherPeriod(leaveStart, dueDate, 100, 8, 'both');

  test('father starts at mother end (no overlap)', () => {
    const result = calculateFatherPeriod(motherResult.end, 100, 8, 0, 'both');
    expect(result).not.toBeNull();
    expect(result!.start.getTime()).toBe(motherResult.end.getTime());
  });

  test('father gets remaining weeks', () => {
    const shared = 8;
    const result = calculateFatherPeriod(motherResult.end, 100, shared, 0, 'both');
    const expectedWeeks = LEAVE_CONFIG[100].father + (LEAVE_CONFIG[100].shared - shared);
    expect(result!.weeks).toBe(expectedWeeks); // 15 + 8 = 23
  });

  test('overlap: father starts before mother ends', () => {
    const overlap = 2;
    const result = calculateFatherPeriod(motherResult.end, 100, 8, overlap, 'both');
    const expectedStart = subtractWeeks(motherResult.end, overlap);
    expect(result!.start.getTime()).toBe(expectedStart.getTime());
  });

  test('mother-only: father returns null', () => {
    const result = calculateFatherPeriod(motherResult.end, 100, 8, 0, 'mother-only');
    expect(result).toBeNull();
  });

  test('father-only: total weeks from fatherOnly config, not config.total', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 100, 0, 0, 'father-only');
    expect(result!.weeks).toBe(LEAVE_CONFIG[100].fatherOnly.total); // 40
  });

  test('father-only 100%: total = 40 uker', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 100, 0, 0, 'father-only');
    expect(result!.weeks).toBe(40);
  });

  test('father-only 80%: total = 52 uker', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 80, 0, 0, 'father-only');
    expect(result!.weeks).toBe(52);
  });
});

// ============================================================
// Gap calculations
// ============================================================
describe('calculateGap', () => {
  test('gap when leave ends before daycare', () => {
    const leaveEnd = new Date(2027, 4, 1); // 1. mai 2027
    const daycare = new Date(2027, 7, 1); // 1. august 2027
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBeGreaterThan(0);
    expect(gap.weeks).toBeGreaterThan(0);
    expect(gap.start.getTime()).toBe(leaveEnd.getTime());
    expect(gap.end.getTime()).toBe(daycare.getTime());
  });

  test('no gap when leave extends past daycare', () => {
    const leaveEnd = new Date(2027, 8, 1); // 1. sept 2027
    const daycare = new Date(2027, 7, 1); // 1. august 2027
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
  });

  test('no gap when leave ends exactly at daycare', () => {
    const daycare = new Date(2027, 7, 1);
    const gap = calculateGap(daycare, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
  });

  test('gap days are approximately 92 for may-august gap', () => {
    const leaveEnd = new Date(2027, 4, 1); // May 1
    const daycare = new Date(2027, 7, 1); // Aug 1
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBe(92); // May has 31, June 30, July 31 = 92
  });
});

// ============================================================
// Integration: standard scenario from PROGRESS.md
// ============================================================
describe('standard scenario: termin 5. juli 2026, 80%, both parents', () => {
  const dueDate = new Date(2026, 6, 5);
  const coverage = 80 as const;
  const shared = LEAVE_CONFIG[coverage].shared; // All shared to mother for this test

  test('leave start is 3 weeks before due date', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    // 5. juli minus 3 uker = 14. juni
    expect(start.getDate()).toBe(14);
    expect(start.getMonth()).toBe(5); // juni
    expect(start.getFullYear()).toBe(2026);
  });

  test('mother period with all shared weeks', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    const mother = calculateMotherPeriod(start, dueDate, coverage, shared, 'both');
    // preBirth(3) + mother(19) + shared(20) = 42 weeks
    const expected = LEAVE_CONFIG[coverage].preBirth + LEAVE_CONFIG[coverage].mother + shared;
    expect(mother.weeks).toBe(expected);
  });

  test('father gets remaining weeks when all shared goes to mother', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    const mother = calculateMotherPeriod(start, dueDate, coverage, shared, 'both');
    const father = calculateFatherPeriod(mother.end, coverage, shared, 0, 'both');
    // father(19) + shared remaining(0) = 19 weeks
    expect(father!.weeks).toBe(LEAVE_CONFIG[coverage].father);
  });
});
