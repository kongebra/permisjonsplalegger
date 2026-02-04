/**
 * Norwegian holidays module
 * Calculates fixed and Easter-relative holidays for 2025-2027
 */

import type { Holiday } from './types';

/**
 * Calculate Easter Sunday using the Computus algorithm (Anonymous Gregorian algorithm)
 * https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
 */
export function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed month
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get all Norwegian public holidays for a specific year
 */
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // Fixed holidays
  holidays.push({
    date: new Date(year, 0, 1), // 1. januar
    name: 'Første nyttårsdag',
    isEasterRelative: false,
  });

  holidays.push({
    date: new Date(year, 4, 1), // 1. mai
    name: 'Arbeidernes dag',
    isEasterRelative: false,
  });

  holidays.push({
    date: new Date(year, 4, 17), // 17. mai
    name: 'Grunnlovsdagen',
    isEasterRelative: false,
  });

  holidays.push({
    date: new Date(year, 11, 25), // 25. desember
    name: 'Første juledag',
    isEasterRelative: false,
  });

  holidays.push({
    date: new Date(year, 11, 26), // 26. desember
    name: 'Andre juledag',
    isEasterRelative: false,
  });

  // Easter-relative holidays
  const easter = calculateEasterSunday(year);

  holidays.push({
    date: addDays(easter, -3), // Skjærtorsdag
    name: 'Skjærtorsdag',
    isEasterRelative: true,
  });

  holidays.push({
    date: addDays(easter, -2), // Langfredag
    name: 'Langfredag',
    isEasterRelative: true,
  });

  holidays.push({
    date: easter, // Første påskedag
    name: 'Første påskedag',
    isEasterRelative: true,
  });

  holidays.push({
    date: addDays(easter, 1), // Andre påskedag
    name: 'Andre påskedag',
    isEasterRelative: true,
  });

  holidays.push({
    date: addDays(easter, 39), // Kristi himmelfartsdag
    name: 'Kristi himmelfartsdag',
    isEasterRelative: true,
  });

  holidays.push({
    date: addDays(easter, 49), // Første pinsedag
    name: 'Første pinsedag',
    isEasterRelative: true,
  });

  holidays.push({
    date: addDays(easter, 50), // Andre pinsedag
    name: 'Andre pinsedag',
    isEasterRelative: true,
  });

  return holidays;
}

// Cache for holiday lookups
const holidayCache = new Map<string, Holiday[]>();

/**
 * Get holidays in a date range (inclusive start, exclusive end)
 */
export function getHolidaysInRange(start: Date, end: Date): Holiday[] {
  const holidays: Holiday[] = [];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const cacheKey = String(year);
    let yearHolidays = holidayCache.get(cacheKey);

    if (!yearHolidays) {
      yearHolidays = getHolidaysForYear(year);
      holidayCache.set(cacheKey, yearHolidays);
    }

    for (const holiday of yearHolidays) {
      if (holiday.date >= start && holiday.date < end) {
        holidays.push(holiday);
      }
    }
  }

  return holidays;
}

/**
 * Create a date key for lookup (YYYY-MM-DD format)
 */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a specific date is a Norwegian public holiday
 */
export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const cacheKey = String(year);
  let yearHolidays = holidayCache.get(cacheKey);

  if (!yearHolidays) {
    yearHolidays = getHolidaysForYear(year);
    holidayCache.set(cacheKey, yearHolidays);
  }

  const targetKey = dateKey(date);
  return yearHolidays.some((h) => dateKey(h.date) === targetKey);
}

/**
 * Get the name of a holiday for a specific date, or null if not a holiday
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const cacheKey = String(year);
  let yearHolidays = holidayCache.get(cacheKey);

  if (!yearHolidays) {
    yearHolidays = getHolidaysForYear(year);
    holidayCache.set(cacheKey, yearHolidays);
  }

  const targetKey = dateKey(date);
  const holiday = yearHolidays.find((h) => dateKey(h.date) === targetKey);
  return holiday?.name ?? null;
}

/**
 * Get a set of date keys for holidays in a range (for efficient calendar lookup)
 */
export function getHolidayDateSet(start: Date, end: Date): Set<string> {
  const holidays = getHolidaysInRange(start, end);
  return new Set(holidays.map((h) => dateKey(h.date)));
}

/**
 * Get a map of date keys to holiday names for a range
 */
export function getHolidayMap(start: Date, end: Date): Map<string, string> {
  const holidays = getHolidaysInRange(start, end);
  const map = new Map<string, string>();
  for (const h of holidays) {
    map.set(dateKey(h.date), h.name);
  }
  return map;
}
