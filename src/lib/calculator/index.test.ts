import { describe, test, expect } from 'bun:test';
import {
  getDefaultDaycareStart,
  getDefaultSharedWeeksToMother,
  calculate,
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

  test('born on august 1: daycare 2 years later', () => {
    const dueDate = new Date(2026, 7, 1); // Aug 1, 2026
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
// Default shared weeks
// ============================================================
describe('getDefaultSharedWeeksToMother', () => {
  test('100%: half of 16 = 8', () => {
    expect(getDefaultSharedWeeksToMother(100)).toBe(8);
  });

  test('80%: half of 18 = 9', () => {
    expect(getDefaultSharedWeeksToMother(80)).toBe(9);
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
