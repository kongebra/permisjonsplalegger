import { startOfDay, isSameDay, getDay, isSameMonth, format, isWithinInterval } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { LeaveSegment, CustomPeriod, GapInfo } from '@/lib/types';
import type { CalendarDayData, CalendarDayPeriod } from './types';
import { DayStatus, STATUS_COLORS, getDayStatusStyle, getSegmentPattern } from './colors';

interface ResolveDayContext {
  segments: LeaveSegment[];
  gap: GapInfo;
  dueDate: Date;
  daycareStart: Date;
  holidayMap: Map<string, string>;
  month: Date;
  today: Date;
  periodStart?: Date;
  periodEnd?: Date;
  // Interactive state (optional)
  customPeriods?: CustomPeriod[];
  lockedDates?: { start: Date; end: Date }[];
  selectionStart?: Date | null;
  selectionEnd?: Date | null;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Compute the DayStatus for a date (replicates CalendarTimeline getDayStatus logic).
 */
export function computeDayStatus(
  date: Date,
  segments: LeaveSegment[],
  gap: GapInfo,
  dueDate: Date,
  daycareStart: Date,
): DayStatus {
  if (isSameDay(date, dueDate)) return 'duedate';

  if (isSameDay(date, daycareStart)) {
    const dateNorm = startOfDay(date);
    const vacationOnDaycare = segments.find((seg) => {
      if (seg.type !== 'vacation') return false;
      const segStartNorm = startOfDay(seg.start);
      const segEndNorm = startOfDay(seg.end);
      return dateNorm >= segStartNorm && dateNorm < segEndNorm;
    });
    if (vacationOnDaycare) {
      return vacationOnDaycare.parent === 'mother'
        ? 'daycareWithMotherVacation'
        : 'daycareWithFatherVacation';
    }
    return 'daycare';
  }

  const isOnOrAfterGapStart = isSameDay(date, gap.start) || date > gap.start;
  const isBeforeGapEnd = date < gap.end && !isSameDay(date, gap.end);
  if (gap.days > 0 && isOnOrAfterGapStart && isBeforeGapEnd) return 'gap';

  const dateNorm = startOfDay(date);
  const matchingSegments = segments.filter((seg) => {
    const segStartNorm = startOfDay(seg.start);
    const segEndNorm = startOfDay(seg.end);
    return dateNorm >= segStartNorm && dateNorm < segEndNorm;
  });

  if (matchingSegments.length > 1) {
    const motherVacation = matchingSegments.find((s) => s.parent === 'mother' && s.type === 'vacation');
    const fatherVacation = matchingSegments.find((s) => s.parent === 'father' && s.type === 'vacation');
    const motherLeave = matchingSegments.find((s) => s.parent === 'mother' && s.type !== 'vacation');
    const fatherLeave = matchingSegments.find((s) => s.parent === 'father' && s.type !== 'vacation');

    if (motherVacation && fatherLeave) return 'motherVacationOverlapFather';
    if (fatherVacation && motherLeave) return 'fatherVacationOverlapMother';
    return 'overlap';
  }

  if (matchingSegments.length === 1) {
    const seg = matchingSegments[0];
    if (seg.type === 'vacation') return seg.parent === 'mother' ? 'motherVacation' : 'fatherVacation';
    if (seg.type === 'unpaid') return 'unpaid';
    return seg.parent === 'mother' ? 'mother' : 'father';
  }

  return 'normal';
}

/**
 * Build periods list from matching segments for a given date.
 */
function buildPeriods(date: Date, segments: LeaveSegment[], customPeriods?: CustomPeriod[]): CalendarDayPeriod[] {
  const dateNorm = startOfDay(date);
  const periods: CalendarDayPeriod[] = [];

  for (const seg of segments) {
    const segStart = startOfDay(seg.start);
    const segEnd = startOfDay(seg.end);
    if (dateNorm >= segStart && dateNorm < segEnd) {
      periods.push({
        id: `${seg.parent}-${seg.type}-${seg.start.toISOString()}`,
        parent: seg.parent,
        type: seg.type,
        pattern: getSegmentPattern(seg.type),
        label: seg.type,
      });
    }
  }

  if (customPeriods) {
    for (const period of customPeriods) {
      const pStart = startOfDay(period.startDate);
      const pEnd = startOfDay(period.endDate);
      if (dateNorm >= pStart && dateNorm < pEnd) {
        periods.push({
          id: period.id,
          parent: period.parent,
          type: period.type,
          pattern: getSegmentPattern(period.type),
          label: period.label || period.type,
        });
      }
    }
  }

  // Sort: mother first, then by type priority
  periods.sort((a, b) => {
    if (a.parent !== b.parent) return a.parent === 'mother' ? -1 : 1;
    return 0;
  });

  return periods;
}

/**
 * Pure function: resolve all display data for a single calendar day.
 */
export function resolveDayData(date: Date, ctx: ResolveDayContext): CalendarDayData {
  const key = dateKey(date);
  const holidayName = ctx.holidayMap.get(key);
  const dayOfWeek = getDay(date); // 0=Sun, 6=Sat
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  const isInPeriod =
    ctx.periodStart && ctx.periodEnd
      ? date >= ctx.periodStart && date <= ctx.periodEnd
      : true;

  const periods = isInPeriod ? buildPeriods(date, ctx.segments, ctx.customPeriods) : [];

  // Selection state
  let isInSelection = false;
  let isSelectionStart = false;
  let isSelectionEnd = false;
  if (ctx.selectionStart && ctx.selectionEnd) {
    const start = ctx.selectionStart < ctx.selectionEnd ? ctx.selectionStart : ctx.selectionEnd;
    const end = ctx.selectionStart < ctx.selectionEnd ? ctx.selectionEnd : ctx.selectionStart;
    isInSelection = isWithinInterval(date, { start, end });
    isSelectionStart = isSameDay(date, ctx.selectionStart);
    isSelectionEnd = isSameDay(date, ctx.selectionEnd);
  }

  // Locked check
  let isLocked = false;
  if (ctx.lockedDates) {
    const normalizedDate = startOfDay(date);
    isLocked = ctx.lockedDates.some(
      (locked) =>
        normalizedDate >= startOfDay(locked.start) && normalizedDate < startOfDay(locked.end),
    );
  }

  const isGapDay =
    ctx.gap.days > 0 &&
    (isSameDay(date, ctx.gap.start) || date > ctx.gap.start) &&
    date < ctx.gap.end &&
    !isSameDay(date, ctx.gap.end);

  return {
    date,
    dayOfMonth: date.getDate(),
    isCurrentMonth: isSameMonth(date, ctx.month),
    isWeekend: isSunday || isSaturday,
    isSunday,
    isSaturday,
    isHoliday: !!holidayName,
    holidayName,
    isToday: isSameDay(date, ctx.today),
    isDueDate: isSameDay(date, ctx.dueDate),
    isDaycareStart: isSameDay(date, ctx.daycareStart),
    isGapDay,
    periods,
    isSelected:
      (ctx.selectionStart !== null && ctx.selectionStart !== undefined && isSameDay(date, ctx.selectionStart)) ||
      (ctx.selectionEnd !== null && ctx.selectionEnd !== undefined && isSameDay(date, ctx.selectionEnd)),
    isInSelection,
    isSelectionStart,
    isSelectionEnd,
    isLocked,
  };
}

/**
 * Build tooltip text for a day (shared between both calendar views).
 */
export function buildDayTooltip(day: CalendarDayData): string {
  let tooltip = format(day.date, 'd. MMMM yyyy', { locale: nb });
  if (day.isHoliday && day.holidayName) tooltip += ` - ${day.holidayName}`;
  if (day.isSunday && !day.isHoliday) tooltip += ' - Søndag';
  if (day.isDueDate) tooltip += ' - Termindato';
  if (day.isDaycareStart) tooltip += ' - Barnehagestart';
  return tooltip;
}

/**
 * Build aria-label for accessibility.
 */
export function buildDayAriaLabel(day: CalendarDayData): string {
  const parts: string[] = [];
  parts.push(format(day.date, 'EEEE d. MMMM yyyy', { locale: nb }));
  if (day.isDueDate) parts.push('termindato');
  if (day.isDaycareStart) parts.push('barnehagestart');
  if (day.isGapDay) parts.push('gap-periode');
  if (day.isHoliday && day.holidayName) parts.push(day.holidayName);
  for (const period of day.periods) {
    const parentLabel = period.parent === 'mother' ? 'mors' : 'fars';
    parts.push(`${parentLabel} ${period.label}`);
  }
  if (day.isLocked) parts.push('låst periode');
  return parts.join(', ');
}

// Re-export for convenience
export { computeDayStatus as getDayStatus };
export type { DayStatus };
export { STATUS_COLORS, getDayStatusStyle };
