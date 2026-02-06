'use client';

import { useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays,
  format,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { DayCell } from './DayCell';
import { PeriodBandRenderer } from './PeriodBandRenderer';
import type { CalendarDayData, PeriodBandData, MonthGridCallbacks } from './types';

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

interface MonthGridProps {
  month: Date;
  days: CalendarDayData[];
  weekBands?: Map<string, { mother: PeriodBandData[]; father: PeriodBandData[] }>;
  interactive?: boolean;
  callbacks?: MonthGridCallbacks;
  isDragging?: boolean;
  showHeader?: boolean;
  headerClassName?: string;
  // For non-interactive mode: provide status class/style per day
  getDayStatusClassName?: (day: CalendarDayData) => string;
  getDayInlineStyle?: (day: CalendarDayData) => React.CSSProperties | undefined;
}

export function MonthGrid({
  month,
  days,
  weekBands,
  interactive = false,
  callbacks,
  isDragging,
  showHeader = true,
  headerClassName,
  getDayStatusClassName,
  getDayInlineStyle,
}: MonthGridProps) {
  // Compute weeks from month
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachWeekOfInterval({ start: calendarStart, end: calendarEnd }, { weekStartsOn: 1 });
  }, [month]);

  // Index days by date key for O(1) lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDayData>();
    for (const day of days) {
      const key = day.date.toISOString().split('T')[0];
      map.set(key, day);
    }
    return map;
  }, [days]);

  const getDaysForWeek = useCallback(
    (weekStart: Date): CalendarDayData[] => {
      const weekDays: CalendarDayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const key = date.toISOString().split('T')[0];
        const day = dayMap.get(key);
        if (day) {
          weekDays.push(day);
        }
      }
      return weekDays;
    },
    [dayMap],
  );

  return (
    <div className="select-none" role="grid" aria-label={format(month, 'MMMM yyyy', { locale: nb })}>
      {showHeader && (
        <h3 className={headerClassName || 'text-sm font-medium text-center mb-1 capitalize'}>
          {format(month, 'MMMM yyyy', { locale: nb })}
        </h3>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1" role="row">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            role="columnheader"
            className={`text-center text-xs font-medium py-1 ${
              idx === 5
                ? 'text-muted-foreground'
                : idx === 6
                  ? 'text-red-600'
                  : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col gap-0.5">
        {weeks.map((weekStart) => {
          const weekDays = getDaysForWeek(weekStart);
          const weekKey = weekStart.toISOString();
          const bands = weekBands?.get(weekKey);

          return (
            <div key={weekKey} className="relative" role="row">
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {weekDays.map((day) => (
                  <DayCell
                    key={day.date.toISOString()}
                    day={day}
                    interactive={interactive}
                    statusClassName={getDayStatusClassName?.(day)}
                    inlineStyle={getDayInlineStyle?.(day)}
                    onDateSelect={callbacks?.onDateSelect}
                    onPointerDown={callbacks?.onPointerDown}
                    onPointerEnter={callbacks?.onPointerEnter}
                    isDragging={isDragging}
                  />
                ))}
              </div>

              {/* Period bands overlay */}
              {bands && (
                <PeriodBandRenderer
                  motherBands={bands.mother}
                  fatherBands={bands.father}
                  onPeriodSelect={callbacks?.onPeriodSelect}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
