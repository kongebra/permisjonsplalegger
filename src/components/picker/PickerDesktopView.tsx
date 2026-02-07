'use client';

import { useState, useMemo } from 'react';
import { addMonths, subMonths, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthGrid } from '@/components/calendar';
import type { PickerMonthData } from './usePickerMonths';

interface PickerDesktopViewProps {
  resolveMonthData: (month: Date) => PickerMonthData;
  onDaySelect: (date: Date) => void;
  initialScrollDate?: Date;
}

export function PickerDesktopView({
  resolveMonthData,
  onDaySelect,
  initialScrollDate,
}: PickerDesktopViewProps) {
  const [currentMonth, setCurrentMonth] = useState(
    () => startOfMonth(initialScrollDate ?? new Date()),
  );

  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  const leftData = useMemo(() => resolveMonthData(currentMonth), [resolveMonthData, currentMonth]);
  const rightData = useMemo(() => resolveMonthData(nextMonth), [resolveMonthData, nextMonth]);

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Forrige måned"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Neste måned"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Two months side by side */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <MonthGrid
            month={leftData.month}
            days={leftData.days}
            weekBands={leftData.weekBands}
            interactive={false}
            pickerMode
            callbacks={{ onDateSelect: onDaySelect }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <MonthGrid
            month={rightData.month}
            days={rightData.days}
            weekBands={rightData.weekBands}
            interactive={false}
            pickerMode
            callbacks={{ onDateSelect: onDaySelect }}
          />
        </div>
      </div>
    </div>
  );
}
