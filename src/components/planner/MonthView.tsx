'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  startOfDay,
  format,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { MonthGrid } from '@/components/calendar';
import { resolveDayData, resolveBands } from '@/components/calendar';
import type { PeriodBandData } from '@/components/calendar';
import { getHolidayMap } from '@/lib/holidays';
import type { CustomPeriod, LeaveSegment } from '@/lib/types';

interface MonthViewProps {
  month: Date;
  dueDate: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  lockedDates: { start: Date; end: Date }[];
  onPeriodSelect?: (periodId: string) => void;
  onDateSelect?: (date: Date) => void;
}

export function MonthView({
  month,
  dueDate,
  segments,
  customPeriods,
  lockedDates,
  onPeriodSelect,
  onDateSelect,
}: MonthViewProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  // Calendar range for this month view
  const calendarRange = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return { start: calStart, end: calEnd };
  }, [month]);

  // Holiday map
  const holidayMap = useMemo(() => {
    return getHolidayMap(calendarRange.start, calendarRange.end);
  }, [calendarRange]);

  // Dummy gap for planner (no gap concept in planner mode)
  const dummyGap = useMemo(
    () => ({ start: new Date(0), end: new Date(0), weeks: 0, days: 0 }),
    [],
  );

  // Compute all day data
  const days = useMemo(() => {
    const allDays = eachDayOfInterval(calendarRange);
    return allDays.map((date) =>
      resolveDayData(date, {
        segments,
        gap: dummyGap,
        dueDate,
        daycareStart: new Date(0),
        holidayMap,
        month,
        today,
        customPeriods,
        lockedDates,
      }),
    );
  }, [calendarRange, segments, dummyGap, dueDate, holidayMap, month, today, customPeriods, lockedDates]);

  // Week bands
  const weekBands = useMemo(() => {
    const weeks = eachWeekOfInterval(calendarRange, { weekStartsOn: 1 });
    const bands = new Map<string, { mother: PeriodBandData[]; father: PeriodBandData[] }>();
    for (const weekStart of weeks) {
      bands.set(weekStart.toISOString(), resolveBands(weekStart, segments, customPeriods));
    }
    return bands;
  }, [calendarRange, segments, customPeriods]);

  return (
    <>
      {/* Month header */}
      <h3 className="text-lg font-semibold text-center mb-4 capitalize">
        {format(month, 'MMMM yyyy', { locale: nb })}
      </h3>

      <MonthGrid
        month={month}
        days={days}
        weekBands={weekBands}
        interactive={false}
        showHeader={false}
        callbacks={{
          onPeriodSelect,
          onDateSelect,
        }}
      />
    </>
  );
}
