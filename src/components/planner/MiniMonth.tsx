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
  format,
  startOfDay,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CustomPeriod, LeaveSegment, Parent } from '@/lib/types';

interface MiniMonthProps {
  month: Date;
  dueDate?: Date;
  daycareStart?: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  isActive: boolean;
  onClick: () => void;
}

// Check if a day has leave for a specific parent
function hasDayLeave(
  date: Date,
  segments: LeaveSegment[],
  customPeriods: CustomPeriod[],
  parent: Parent
): boolean {
  const normalizedDate = startOfDay(date);

  // Check segments
  const hasSegment = segments.some(
    (s) =>
      s.parent === parent &&
      normalizedDate >= startOfDay(s.start) &&
      normalizedDate < startOfDay(s.end)
  );

  // Check custom periods
  const hasPeriod = customPeriods.some(
    (p) =>
      p.parent === parent &&
      normalizedDate >= startOfDay(p.startDate) &&
      normalizedDate < startOfDay(p.endDate)
  );

  return hasSegment || hasPeriod;
}

export function MiniMonth({
  month,
  dueDate,
  daycareStart,
  segments,
  customPeriods,
  isActive,
  onClick,
}: MiniMonthProps) {
  // Get all days for this month's calendar view
  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [month]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg border-2 transition-all text-left',
        'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
        isActive ? 'border-primary bg-primary/5' : 'border-muted'
      )}
    >
      {/* Month name */}
      <div className="text-xs font-medium capitalize mb-1">
        {format(month, 'MMM yyyy', { locale: nb })}
      </div>

      {/* Mini calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isDue = dueDate && isSameDay(day, dueDate);
          const isDaycare = daycareStart && isSameDay(day, daycareStart);
          const hasMother = hasDayLeave(day, segments, customPeriods, 'mother');
          const hasFather = hasDayLeave(day, segments, customPeriods, 'father');
          const isSunday = day.getDay() === 0;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'w-2 h-2 rounded-full',
                !isCurrentMonth && 'opacity-20',
                // Due date and daycare start trump leave colors
                isDue
                  ? 'bg-violet-500 ring-1 ring-violet-300'
                  : isDaycare
                    ? 'bg-emerald-500 ring-1 ring-emerald-300'
                    : hasMother && hasFather
                      ? 'bg-gradient-to-r from-pink-400 to-blue-400'
                      : hasMother
                        ? 'bg-pink-400'
                        : hasFather
                          ? 'bg-blue-400'
                          : isSunday
                            ? 'bg-red-200'
                            : 'bg-muted',
              )}
            />
          );
        })}
      </div>
    </button>
  );
}
