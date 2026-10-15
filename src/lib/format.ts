/**
 * Shared formatting utilities
 */

import { WORK_DAYS_PER_WEEK } from './constants';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Velger entall for nøyaktig 1, ellers flertall (norsk: "1 uke", "2 uker") */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "1 uke" / "3 uker" */
export function formatWeeks(count: number): string {
  return pluralize(count, 'uke', 'uker');
}

/** "1 dag" / "3 dager" */
export function formatDays(count: number): string {
  return pluralize(count, 'dag', 'dager');
}

/**
 * Arbeidsdager (man-fre) som uker og dager i en 5-dagers uke:
 * 51 -> "10 uker 1 dag", 5 -> "1 uke", 3 -> "3 dager".
 * Samme format som gap-statusen i kalenderen.
 */
export function formatWorkdays(workDays: number): string {
  const weeks = Math.floor(workDays / WORK_DAYS_PER_WEEK);
  const days = workDays % WORK_DAYS_PER_WEEK;
  if (weeks === 0) return formatDays(days);
  return days > 0 ? `${formatWeeks(weeks)} ${formatDays(days)}` : formatWeeks(weeks);
}
