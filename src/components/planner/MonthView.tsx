'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  format,
  startOfDay,
  addDays,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { DayCell } from './DayCell';
import { StripeRenderer } from './StripeRenderer';
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
  isDragging?: boolean;
  onDayClick: (date: Date) => void;
  onDayPointerDown?: (date: Date) => void;
  onDayPointerEnter?: (date: Date) => void;
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
  isDragging,
  onDayClick,
  onDayPointerDown,
  onDayPointerEnter,
}: MonthViewProps) {
  // Get all weeks in the calendar view
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachWeekOfInterval({ start: calendarStart, end: calendarEnd }, { weekStartsOn: 1 });
  }, [month]);

  // Get all days to display
  const days = useMemo(() => {
    if (weeks.length === 0) return [];
    const calendarEnd = addDays(weeks[weeks.length - 1], 6);
    return eachDayOfInterval({ start: weeks[0], end: calendarEnd });
  }, [weeks]);

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

  // Get days for a specific week
  const getDaysForWeek = (weekStart: Date) => {
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  };

  return (
    <div className="select-none">
      {/* Month header */}
      <h3 className="text-lg font-semibold text-center mb-4 capitalize">
        {format(month, 'MMMM yyyy', { locale: nb })}
      </h3>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              idx === 6 ? 'text-red-600' : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows with stripe overlay */}
      <div className="flex flex-col gap-0.5">
        {weeks.map((weekStart) => {
          const weekDays = getDaysForWeek(weekStart);

          return (
            <div key={weekStart.toISOString()} className="relative">
              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {weekDays.map((day) => {
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
                      isSelected={
                        (selectionStart !== null && isSameDay(day, selectionStart)) ||
                        (selectionEnd !== null && isSameDay(day, selectionEnd))
                      }
                      isInSelection={isInSelectionRange(day)}
                      isSelectionStart={selectionStart !== null && isSameDay(day, selectionStart)}
                      isSelectionEnd={selectionEnd !== null && isSameDay(day, selectionEnd)}
                      isLocked={isDateLocked(day)}
                      isDragging={isDragging}
                      onClick={onDayClick}
                      onPointerDown={onDayPointerDown}
                      onPointerEnter={onDayPointerEnter}
                    />
                  );
                })}
              </div>

              {/* Horizontal stripes overlay */}
              <StripeRenderer
                weekStart={weekStart}
                segments={segments}
                customPeriods={customPeriods}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
