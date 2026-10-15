/**
 * Shared formatting utilities
 */

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
