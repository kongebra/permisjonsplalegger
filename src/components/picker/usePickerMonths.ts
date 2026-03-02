'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  addMonths,
  startOfDay,
  subDays,
} from 'date-fns';
import { resolveDayData, resolveBands } from '@/components/calendar';
import type { CalendarDayData, PeriodBandData } from '@/components/calendar';
import type { LeaveSegment, CustomPeriod } from '@/lib/types';
import type { CalendarEvent, IconMarker } from './types';

export interface PickerMonthData {
  month: Date;
  days: CalendarDayData[];
  weekBands: Map<string, { mother: PeriodBandData[]; father: PeriodBandData[] }>;
}

/**
 * Convert CalendarEvent[] → LeaveSegment[] + CustomPeriod[] for the resolver functions.
 */
function eventsToResolverData(events: CalendarEvent[]): {
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
} {
  const segments: LeaveSegment[] = [];
  const customPeriods: CustomPeriod[] = [];

  for (const event of events) {
    // Wizard-generated segments use segment type names
    const isSegment = [
      'preBirth', 'mandatory', 'quota', 'shared',
      'overlap', 'vacation', 'unpaid', 'gap',
    ].includes(event.type);

    if (isSegment) {
      segments.push({
        parent: event.parent,
        type: event.type as LeaveSegment['type'],
        start: event.startDate,
        end: event.endDate,
        weeks: 0, // Not used by resolveBands
      });
    } else {
      customPeriods.push({
        id: event.id,
        type: event.type as CustomPeriod['type'],
        parent: event.parent,
        startDate: event.startDate,
        endDate: event.endDate,
        label: event.label,
        color: event.inlineColor,
      });
    }
  }

  return { segments, customPeriods };
}

/**
 * Generate the list of months to display.
 */
function generateMonthList(centerDate: Date, rangeMonths: number): Date[] {
  const months: Date[] = [];
  for (let i = -rangeMonths; i <= rangeMonths; i++) {
    months.push(startOfMonth(addMonths(centerDate, i)));
  }
  return months;
}

/**
 * Get the number of calendar weeks for a month (4, 5, or 6).
 */
export function getMonthWeekCount(year: number, month: number): number {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // last day
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return Math.round((calEnd.getTime() - calStart.getTime()) / (7 * 86400000));
}

// Height constants — no PeriodBandRenderer in picker mode (strips are inside cells)
const MONTH_TITLE_H = 28; // text-sm font-semibold + mb-2
const ROW_H = 44; // fixed cell height
const MONTH_GAP = 24; // mb-6 between months

/**
 * Calculate deterministic placeholder height for a month.
 * No band renderer — period strips are inside the day cells.
 */
export function getMonthPlaceholderHeight(weekCount: number): number {
  return MONTH_TITLE_H + weekCount * ROW_H + MONTH_GAP;
}

interface UsePickerMonthsOptions {
  events: CalendarEvent[];
  iconMarkers?: IconMarker[];
  holidayMap: Map<string, string>;
  selectionStart: Date | null;
  selectionEnd: Date | null; // exclusive
  initialScrollDate?: Date;
  rangeMonths?: number; // default 36 (±36 months)
}

export function usePickerMonths({
  events,
  iconMarkers,
  holidayMap,
  selectionStart,
  selectionEnd,
  initialScrollDate,
  rangeMonths = 36,
}: UsePickerMonthsOptions) {
  const centerDate = initialScrollDate ?? new Date();

  // Generate month list (stable unless centerDate changes)
  const months = useMemo(
    () => generateMonthList(centerDate, rangeMonths),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerDate.getFullYear(), centerDate.getMonth(), rangeMonths],
  );

  // Pre-calculate placeholder heights
  const monthHeights = useMemo(
    () => months.map((m) => getMonthPlaceholderHeight(getMonthWeekCount(m.getFullYear(), m.getMonth()))),
    [months],
  );

  // Convert events to resolver-compatible format
  const { segments, customPeriods } = useMemo(
    () => eventsToResolverData(events),
    [events],
  );

  // Find icon marker dates
  const dueDate = useMemo(
    () => iconMarkers?.find((m) => m.type === 'dueDate')?.date ?? new Date(0),
    [iconMarkers],
  );
  const daycareStart = useMemo(
    () => iconMarkers?.find((m) => m.type === 'daycareStart')?.date ?? new Date(0),
    [iconMarkers],
  );

  // Dummy gap (picker doesn't show gap styling on day cells)
  const dummyGap = useMemo(() => ({ start: new Date(0), end: new Date(0), weeks: 0, days: 0, workDays: 0 }), []);
  const today = useMemo(() => startOfDay(new Date()), []);

  // Resolve data for a single month
  const resolveMonthData = useMemo(() => {
    return (month: Date): PickerMonthData => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      // Convert exclusive selectionEnd to inclusive for resolveDayData
      const inclusiveEnd = selectionEnd ? subDays(selectionEnd, 1) : null;

      const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
      const days = allDays.map((date) =>
        resolveDayData(date, {
          segments,
          gap: dummyGap,
          dueDate,
          daycareStart,
          holidayMap,
          month: monthStart,
          today,
          customPeriods,
          selectionStart,
          selectionEnd: inclusiveEnd,
        }),
      );

      const weeks = eachWeekOfInterval({ start: calStart, end: calEnd }, { weekStartsOn: 1 });
      const weekBands = new Map<string, { mother: PeriodBandData[]; father: PeriodBandData[] }>();
      for (const weekStart of weeks) {
        weekBands.set(weekStart.toISOString(), resolveBands(weekStart, segments, customPeriods));
      }

      return { month: monthStart, days, weekBands };
    };
  }, [segments, customPeriods, dummyGap, dueDate, daycareStart, holidayMap, today, selectionStart, selectionEnd]);

  return {
    months,
    monthHeights,
    resolveMonthData,
  };
}
