import { describe, test, expect } from 'bun:test';
import { resolveBands } from './resolve-bands';
import type { LeaveSegment } from '@/lib/types';

// Mandag 2026-12-21, så uka dekker 21.-27. desember
const weekStart = new Date(2026, 11, 21);

describe('resolveBands: far med aktivitetskrav (kun far)', () => {
  const segment: LeaveSegment = {
    parent: 'father',
    type: 'activity-required',
    start: new Date(2026, 11, 24),
    end: new Date(2027, 6, 22),
    weeks: 30,
  };

  test('får lesbar etikett og fars farge i stedet for rå typenavn og grå fallback', () => {
    const { father } = resolveBands(weekStart, [segment]);
    expect(father).toHaveLength(1);
    expect(father[0].label).toBe('Far med aktivitetskrav');
    expect(father[0].color).toBe('bg-father-base');
  });
});
