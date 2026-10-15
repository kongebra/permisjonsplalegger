import { describe, expect, test } from 'bun:test';
import { formatDays, formatWeeks, pluralize } from './format';

describe('pluralize', () => {
  test('bruker entall for 1', () => {
    expect(pluralize(1, 'uke', 'uker')).toBe('1 uke');
  });
  test('bruker flertall for 0 og for tall over 1', () => {
    expect(pluralize(0, 'uke', 'uker')).toBe('0 uker');
    expect(pluralize(2, 'uke', 'uker')).toBe('2 uker');
  });
});

describe('formatWeeks og formatDays', () => {
  test('uker', () => {
    expect(formatWeeks(1)).toBe('1 uke');
    expect(formatWeeks(10)).toBe('10 uker');
  });
  test('dager', () => {
    expect(formatDays(1)).toBe('1 dag');
    expect(formatDays(4)).toBe('4 dager');
    expect(formatDays(0)).toBe('0 dager');
  });
});
