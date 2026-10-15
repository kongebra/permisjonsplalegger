/**
 * Månedsintervall for termindato-velgeren: fra januar i år til desember om to
 * år, utvidet slik at den valgte datoen alltid er innenfor. Uten utvidelsen
 * klippes en lagret termindato fra i fjor (eller langt frem) bort, og velgeren
 * kan ikke vise den.
 */
export function getDueDateRange(
  selected: Date,
  today: Date = new Date(),
): { startMonth: Date; endMonth: Date } {
  const thisYear = today.getFullYear();
  return {
    startMonth: new Date(Math.min(thisYear, selected.getFullYear()), 0),
    endMonth: new Date(Math.max(thisYear + 2, selected.getFullYear()), 11),
  };
}
