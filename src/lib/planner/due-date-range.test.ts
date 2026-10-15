import { describe, test, expect } from 'bun:test';
import { getDueDateRange } from './due-date-range';

const today = new Date(2026, 9, 15);

describe('getDueDateRange', () => {
  test('standard: januar i år til desember om to år', () => {
    const { startMonth, endMonth } = getDueDateRange(new Date(2027, 2, 1), today);
    expect(startMonth).toEqual(new Date(2026, 0));
    expect(endMonth).toEqual(new Date(2028, 11));
  });

  test('termindato i fjor utvider start slik at datoen kan vises', () => {
    const { startMonth, endMonth } = getDueDateRange(new Date(2025, 10, 15), today);
    expect(startMonth).toEqual(new Date(2025, 0));
    expect(endMonth).toEqual(new Date(2028, 11));
  });

  test('termindato langt frem utvider slutten', () => {
    const { startMonth, endMonth } = getDueDateRange(new Date(2030, 5, 1), today);
    expect(startMonth).toEqual(new Date(2026, 0));
    expect(endMonth).toEqual(new Date(2030, 11));
  });
});
