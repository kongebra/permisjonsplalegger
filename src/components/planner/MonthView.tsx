'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  format,
  startOfDay,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { DayCell } from './DayCell';
import { getHolidayMap } from '@/lib/holidays';
import type { CustomPeriod, LeaveSegment } from '@/lib/types';

interface MonthViewProps {
  month: Date;
  dueDate: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  lockedDates: { start: Date; end: Date }[];
  selectionStart: Date | null;
  selectionEnd: Date | null;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export function MonthView({
  month,
  dueDate,
  segments,
  customPeriods,
  lockedDates,
  selectionStart,
  selectionEnd,
  onDayClick,
}: MonthViewProps) {
  // Get all days to display (including partial weeks from prev/next month)
  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [month]);

  // Get holiday map for the visible range
  const holidayMap = useMemo(() => {
    if (days.length === 0) return new Map<string, string>();
    return getHolidayMap(days[0], days[days.length - 1]);
  }, [days]);

  // Today's date
  const today = useMemo(() => startOfDay(new Date()), []);

  // Helper to check if date is in selection range
  const isInSelectionRange = (date: Date) => {
    if (!selectionStart || !selectionEnd) return false;
    const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
    const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
    return isWithinInterval(date, { start, end });
  };

  // Helper to check if date is locked
  const isDateLocked = (date: Date) => {
    const normalizedDate = startOfDay(date);
    return lockedDates.some(
      (locked) =>
        normalizedDate >= startOfDay(locked.start) &&
        normalizedDate < startOfDay(locked.end)
    );
  };

  // Helper to get date key for holiday lookup
  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="select-none">
      {/* Month header */}
      <h3 className="text-lg font-semibold text-center mb-4 capitalize">
        {format(month, 'MMMM yyyy', { locale: nb })}
      </h3>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dateKey = getDateKey(day);
          const holidayName = holidayMap.get(dateKey);

          return (
            <DayCell
              key={day.toISOString()}
              date={day}
              isCurrentMonth={isSameMonth(day, month)}
              isToday={isSameDay(day, today)}
              isHoliday={!!holidayName}
              holidayName={holidayName}
              isDueDate={isSameDay(day, dueDate)}
              segments={segments}
              customPeriods={customPeriods}
              isSelected={
                (selectionStart && isSameDay(day, selectionStart)) ||
                (selectionEnd && isSameDay(day, selectionEnd))
              }
              isInSelection={isInSelectionRange(day)}
              isSelectionStart={selectionStart !== null && isSameDay(day, selectionStart)}
              isSelectionEnd={selectionEnd !== null && isSameDay(day, selectionEnd)}
              isLocked={isDateLocked(day)}
              onClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
