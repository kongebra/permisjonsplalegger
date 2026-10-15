import { describe, test, expect } from 'bun:test';
import { dateKey } from './resolve-day';

describe('dateKey', () => {
  test('gir lokal kalenderdato, ikke UTC-forskjøvet (TZ=Europe/Oslo)', () => {
    // Lokal midnatt er 23:00 UTC dagen før i Oslo, toISOString ville gitt 2026-03-09
    expect(dateKey(new Date(2026, 2, 10))).toBe('2026-03-10');
  });

  test('fungerer ved sommertid og årsskifte', () => {
    expect(dateKey(new Date(2026, 6, 1))).toBe('2026-07-01');
    expect(dateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(dateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});
