import { describe, test, expect } from 'bun:test';
import {
  calculateEasterSunday,
  getHolidaysForYear,
  getHolidaysInRange,
  isHoliday,
  getHolidayName,
  getHolidayDateSet,
  getHolidayMap,
} from './holidays';

// Forventede verdier er utledet uavhengig av koden fra kjente påskedatoer
// (kirkekalenderen): 2024-03-31, 2025-04-20, 2026-04-05, 2027-03-28, 2028-04-16.
// Øvrige bevegelige helligdager er påskedag + fast offset
// (-3 skjærtorsdag, -2 langfredag, +1 2. påskedag, +39 Kristi himmelfart,
// +49 pinsedag, +50 2. pinsedag), regnet ut for hånd.

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

// ============================================================
// calculateEasterSunday
// ============================================================
describe('calculateEasterSunday', () => {
  const known: [number, number, number][] = [
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2028, 4, 16],
  ];

  for (const [year, m, d] of known) {
    test(`påskedag ${year} er ${year}-${m}-${d}`, () => {
      expect(ymd(calculateEasterSunday(year))).toEqual([year, m, d]);
    });
  }

  test('påskedag er alltid en søndag', () => {
    for (let year = 2020; year <= 2040; year++) {
      expect(calculateEasterSunday(year).getDay()).toBe(0);
    }
  });

  test('påskedag ligger mellom 22. mars og 25. april', () => {
    for (let year = 2000; year <= 2100; year++) {
      const easter = calculateEasterSunday(year);
      expect(easter >= new Date(year, 2, 22)).toBe(true);
      expect(easter <= new Date(year, 3, 25)).toBe(true);
    }
  });
});

// ============================================================
// getHolidaysForYear
// ============================================================
describe('getHolidaysForYear', () => {
  test('returnerer 12 helligdager', () => {
    expect(getHolidaysForYear(2026)).toHaveLength(12);
  });

  test('faste helligdager er på riktig dato i 2026', () => {
    const byName = new Map(getHolidaysForYear(2026).map((h) => [h.name, h]));
    expect(ymd(byName.get('Første nyttårsdag')!.date)).toEqual([2026, 1, 1]);
    expect(ymd(byName.get('Arbeidernes dag')!.date)).toEqual([2026, 5, 1]);
    expect(ymd(byName.get('Grunnlovsdagen')!.date)).toEqual([2026, 5, 17]);
    expect(ymd(byName.get('Første juledag')!.date)).toEqual([2026, 12, 25]);
    expect(ymd(byName.get('Andre juledag')!.date)).toEqual([2026, 12, 26]);
    for (const name of [
      'Første nyttårsdag',
      'Arbeidernes dag',
      'Grunnlovsdagen',
      'Første juledag',
      'Andre juledag',
    ]) {
      expect(byName.get(name)!.isEasterRelative).toBe(false);
    }
  });

  const moveable: Record<number, Record<string, number[]>> = {
    2025: {
      Skjærtorsdag: [2025, 4, 17],
      Langfredag: [2025, 4, 18],
      'Første påskedag': [2025, 4, 20],
      'Andre påskedag': [2025, 4, 21],
      'Kristi himmelfartsdag': [2025, 5, 29],
      'Første pinsedag': [2025, 6, 8],
      'Andre pinsedag': [2025, 6, 9],
    },
    2026: {
      Skjærtorsdag: [2026, 4, 2],
      Langfredag: [2026, 4, 3],
      'Første påskedag': [2026, 4, 5],
      'Andre påskedag': [2026, 4, 6],
      'Kristi himmelfartsdag': [2026, 5, 14],
      'Første pinsedag': [2026, 5, 24],
      'Andre pinsedag': [2026, 5, 25],
    },
    2027: {
      Skjærtorsdag: [2027, 3, 25],
      Langfredag: [2027, 3, 26],
      'Første påskedag': [2027, 3, 28],
      'Andre påskedag': [2027, 3, 29],
      'Kristi himmelfartsdag': [2027, 5, 6],
      'Første pinsedag': [2027, 5, 16],
      'Andre pinsedag': [2027, 5, 17],
    },
  };

  for (const [year, expected] of Object.entries(moveable)) {
    test(`bevegelige helligdager i ${year}`, () => {
      const byName = new Map(
        getHolidaysForYear(Number(year)).map((h) => [h.name, h])
      );
      for (const [name, date] of Object.entries(expected)) {
        const holiday = byName.get(name);
        expect(holiday).toBeDefined();
        expect(ymd(holiday!.date)).toEqual(date);
        expect(holiday!.isEasterRelative).toBe(true);
      }
    });
  }

  test('ukedager for bevegelige helligdager stemmer', () => {
    const byName = new Map(getHolidaysForYear(2026).map((h) => [h.name, h]));
    expect(byName.get('Skjærtorsdag')!.date.getDay()).toBe(4);
    expect(byName.get('Langfredag')!.date.getDay()).toBe(5);
    expect(byName.get('Første påskedag')!.date.getDay()).toBe(0);
    expect(byName.get('Andre påskedag')!.date.getDay()).toBe(1);
    expect(byName.get('Kristi himmelfartsdag')!.date.getDay()).toBe(4);
    expect(byName.get('Første pinsedag')!.date.getDay()).toBe(0);
    expect(byName.get('Andre pinsedag')!.date.getDay()).toBe(1);
  });

  test('helligdager som faller i helgen er fortsatt helligdager', () => {
    // 1. mai 2027 og 25. desember 2027 er lørdager
    expect(new Date(2027, 4, 1).getDay()).toBe(6);
    expect(isHoliday(new Date(2027, 4, 1))).toBe(true);
    expect(new Date(2027, 11, 25).getDay()).toBe(6);
    expect(isHoliday(new Date(2027, 11, 25))).toBe(true);
    // 17. mai 2026 er en søndag
    expect(new Date(2026, 4, 17).getDay()).toBe(0);
    expect(isHoliday(new Date(2026, 4, 17))).toBe(true);
  });

  test('flyttes ikke til mandag når helligdag faller i helg', () => {
    // 17. mai 2026 (søndag): mandag 18. mai er ikke fridag
    expect(isHoliday(new Date(2026, 4, 18))).toBe(false);
  });
});

// ============================================================
// isHoliday / getHolidayName
// ============================================================
describe('isHoliday', () => {
  test('gjenkjenner helligdager', () => {
    expect(isHoliday(new Date(2026, 0, 1))).toBe(true);
    expect(isHoliday(new Date(2026, 3, 3))).toBe(true); // langfredag
    expect(isHoliday(new Date(2026, 11, 26))).toBe(true);
  });

  test('vanlige dager er ikke helligdager', () => {
    expect(isHoliday(new Date(2026, 0, 2))).toBe(false);
    expect(isHoliday(new Date(2026, 6, 15))).toBe(false);
    expect(isHoliday(new Date(2026, 11, 24))).toBe(false); // julaften er ikke offisiell fridag
  });

  test('ignorerer klokkeslett på datoen', () => {
    expect(isHoliday(new Date(2026, 4, 17, 15, 30))).toBe(true);
    expect(isHoliday(new Date(2026, 4, 17, 0, 0, 0))).toBe(true);
  });

  test('dagen før og etter en helligdag er ikke helligdag', () => {
    expect(isHoliday(new Date(2026, 4, 16))).toBe(false);
    expect(isHoliday(new Date(2026, 4, 18))).toBe(false);
  });

  test('fungerer på tvers av årsskifte', () => {
    expect(isHoliday(new Date(2025, 11, 31))).toBe(false);
    expect(isHoliday(new Date(2026, 0, 1))).toBe(true);
  });
});

describe('getHolidayName', () => {
  test('returnerer navn for helligdager', () => {
    expect(getHolidayName(new Date(2026, 0, 1))).toBe('Første nyttårsdag');
    expect(getHolidayName(new Date(2026, 3, 2))).toBe('Skjærtorsdag');
    expect(getHolidayName(new Date(2026, 3, 3))).toBe('Langfredag');
    expect(getHolidayName(new Date(2026, 3, 5))).toBe('Første påskedag');
    expect(getHolidayName(new Date(2026, 3, 6))).toBe('Andre påskedag');
    expect(getHolidayName(new Date(2026, 4, 14))).toBe('Kristi himmelfartsdag');
    expect(getHolidayName(new Date(2026, 4, 24))).toBe('Første pinsedag');
    expect(getHolidayName(new Date(2026, 4, 25))).toBe('Andre pinsedag');
    expect(getHolidayName(new Date(2026, 11, 25))).toBe('Første juledag');
  });

  test('returnerer null for vanlige dager', () => {
    expect(getHolidayName(new Date(2026, 6, 15))).toBeNull();
  });
});

// ============================================================
// getHolidaysInRange
// ============================================================
describe('getHolidaysInRange', () => {
  test('start er inklusiv og slutt er eksklusiv', () => {
    // 1. mai (inkl.) til 17. mai (eksl.) gir 1. mai og Kristi himmelfart (14. mai)
    const result = getHolidaysInRange(new Date(2026, 4, 1), new Date(2026, 4, 17));
    expect(result.map((h) => h.name).sort()).toEqual(
      ['Arbeidernes dag', 'Kristi himmelfartsdag'].sort()
    );
  });

  test('slutt dagen etter helligdag inkluderer helligdagen', () => {
    const result = getHolidaysInRange(new Date(2026, 4, 15), new Date(2026, 4, 18));
    expect(result.map((h) => h.name)).toEqual(['Grunnlovsdagen']);
    const exclusive = getHolidaysInRange(new Date(2026, 4, 15), new Date(2026, 4, 17));
    expect(exclusive).toEqual([]);
  });

  test('påskeuken 2026 gir fire helligdager', () => {
    const result = getHolidaysInRange(new Date(2026, 3, 1), new Date(2026, 3, 10));
    expect(result.map((h) => h.name).sort()).toEqual(
      ['Skjærtorsdag', 'Langfredag', 'Første påskedag', 'Andre påskedag'].sort()
    );
  });

  test('tom periode gir ingen helligdager', () => {
    expect(
      getHolidaysInRange(new Date(2026, 6, 1), new Date(2026, 6, 31))
    ).toEqual([]);
    const d = new Date(2026, 4, 17);
    expect(getHolidaysInRange(d, d)).toEqual([]);
  });

  test('strekker seg over årsskifte', () => {
    const result = getHolidaysInRange(new Date(2025, 11, 20), new Date(2026, 0, 5));
    expect(result.map((h) => h.name).sort()).toEqual(
      ['Første juledag', 'Andre juledag', 'Første nyttårsdag'].sort()
    );
  });

  test('et helt år gir 12 helligdager', () => {
    expect(
      getHolidaysInRange(new Date(2026, 0, 1), new Date(2027, 0, 1))
    ).toHaveLength(12);
  });

  test('flere år gir 12 per år', () => {
    expect(
      getHolidaysInRange(new Date(2025, 0, 1), new Date(2028, 0, 1))
    ).toHaveLength(36);
  });

  test('gjentatte kall gir samme resultat (cache)', () => {
    const a = getHolidaysInRange(new Date(2027, 0, 1), new Date(2027, 11, 31));
    const b = getHolidaysInRange(new Date(2027, 0, 1), new Date(2027, 11, 31));
    expect(b.map((h) => h.name)).toEqual(a.map((h) => h.name));
  });
});

// ============================================================
// getHolidayDateSet / getHolidayMap
// ============================================================
describe('getHolidayDateSet', () => {
  test('bruker nøkkelformat YYYY-MM-DD med nullpadding', () => {
    const set = getHolidayDateSet(new Date(2026, 0, 1), new Date(2026, 0, 2));
    expect([...set]).toEqual(['2026-01-01']);
  });

  test('inneholder påskehelligdagene 2026', () => {
    const set = getHolidayDateSet(new Date(2026, 3, 1), new Date(2026, 3, 10));
    expect(set.has('2026-04-02')).toBe(true);
    expect(set.has('2026-04-03')).toBe(true);
    expect(set.has('2026-04-05')).toBe(true);
    expect(set.has('2026-04-06')).toBe(true);
    expect(set.has('2026-04-04')).toBe(false); // påskeaften er ikke helligdag
    expect(set.size).toBe(4);
  });
});

describe('getHolidayMap', () => {
  test('kobler datonøkkel til helligdagsnavn', () => {
    const map = getHolidayMap(new Date(2026, 4, 1), new Date(2026, 4, 31));
    expect(map.get('2026-05-01')).toBe('Arbeidernes dag');
    expect(map.get('2026-05-14')).toBe('Kristi himmelfartsdag');
    expect(map.get('2026-05-17')).toBe('Grunnlovsdagen');
    expect(map.get('2026-05-24')).toBe('Første pinsedag');
    expect(map.get('2026-05-25')).toBe('Andre pinsedag');
    expect(map.size).toBe(5);
  });

  test('tom for periode uten helligdager', () => {
    expect(getHolidayMap(new Date(2026, 6, 1), new Date(2026, 6, 31)).size).toBe(0);
  });
});
