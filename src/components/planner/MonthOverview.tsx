'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  format,
  isSameMonth,
  addMonths,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LeaveSegment, CustomPeriod } from '@/lib/types';

interface MonthOverviewProps {
  startDate: Date;
  endDate: Date;
  activeMonth: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  onMonthSelect: (month: Date) => void;
  onClose: () => void;
}

export function MonthOverview({
  startDate,
  endDate,
  activeMonth,
  segments,
  customPeriods,
  onMonthSelect,
  onClose,
}: MonthOverviewProps) {
  // Get all months in the range
  const months = useMemo(() => {
    // Extend range to show context
    const start = addMonths(startOfMonth(startDate), -2);
    const end = addMonths(endOfMonth(endDate), 2);
    return eachMonthOfInterval({ start, end });
  }, [startDate, endDate]);

  // Check if a month has any segments or periods
  const getMonthIndicator = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const hasMotherSegment = segments.some(
      (s) => s.parent === 'mother' && s.start < monthEnd && s.end > monthStart
    );
    const hasFatherSegment = segments.some(
      (s) => s.parent === 'father' && s.start < monthEnd && s.end > monthStart
    );
    const hasMotherPeriod = customPeriods.some(
      (p) => p.parent === 'mother' && p.startDate < monthEnd && p.endDate > monthStart
    );
    const hasFatherPeriod = customPeriods.some(
      (p) => p.parent === 'father' && p.startDate < monthEnd && p.endDate > monthStart
    );

    return {
      mother: hasMotherSegment || hasMotherPeriod,
      father: hasFatherSegment || hasFatherPeriod,
    };
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Velg måned</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Lukk
        </button>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {months.map((month) => {
            const indicator = getMonthIndicator(month);
            const isActive = isSameMonth(month, activeMonth);

            return (
              <button
                key={month.toISOString()}
                onClick={() => {
                  onMonthSelect(month);
                  onClose();
                }}
                className={cn(
                  'p-3 rounded-lg border-2 text-center transition-all',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                  isActive ? 'border-primary bg-primary/5' : 'border-muted'
                )}
              >
                <div className="text-sm font-medium capitalize">
                  {format(month, 'MMM', { locale: nb })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(month, 'yyyy')}
                </div>

                {/* Period indicators */}
                {(indicator.mother || indicator.father) && (
                  <div className="flex justify-center gap-1 mt-2">
                    {indicator.mother && (
                      <div className="w-2 h-2 rounded-full bg-pink-400" />
                    )}
                    {indicator.father && (
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t p-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-400" />
          <span>Mor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span>Far</span>
        </div>
      </div>
    </div>
  );
}
