'use client';

import { useMemo } from 'react';
import { startOfMonth, eachMonthOfInterval, addMonths, isSameMonth } from 'date-fns';
import { X } from 'lucide-react';
import { MiniMonth } from './MiniMonth';
import type { CustomPeriod, LeaveSegment } from '@/lib/types';

interface YearOverviewProps {
  startDate: Date;
  endDate: Date;
  dueDate?: Date;
  daycareStart?: Date;
  activeMonth: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  onMonthSelect: (month: Date) => void;
  onClose: () => void;
}

export function YearOverview({
  startDate,
  endDate,
  dueDate,
  daycareStart,
  activeMonth,
  segments,
  customPeriods,
  onMonthSelect,
  onClose,
}: YearOverviewProps) {
  // Get all months to display (with some padding)
  const months = useMemo(() => {
    const start = addMonths(startOfMonth(startDate), -2);
    const end = addMonths(startOfMonth(endDate), 2);
    return eachMonthOfInterval({ start, end });
  }, [startDate, endDate]);

  const handleMonthClick = (month: Date) => {
    onMonthSelect(month);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Årsoversikt</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="Lukk"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {months.map((month) => (
            <MiniMonth
              key={month.toISOString()}
              month={month}
              dueDate={dueDate}
              daycareStart={daycareStart}
              segments={segments}
              customPeriods={customPeriods}
              isActive={isSameMonth(month, activeMonth)}
              onClick={() => handleMonthClick(month)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <ul className="border-t p-4 flex flex-wrap justify-center gap-6 text-sm list-none">
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mother-strong" role="img" aria-label="Mor farge" />
          <span>Mor</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-father-strong" role="img" aria-label="Far farge" />
          <span>Far</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-mother-strong to-father-strong" role="img" aria-label="Overlapp farge" />
          <span>Overlapp</span>
        </li>
        {dueDate && (
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-duedate" role="img" aria-label="Termin markør" />
            <span>Termin</span>
          </li>
        )}
        {daycareStart && (
          <li className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-daycare" role="img" aria-label="Barnehagestart markør" />
            <span>Barnehagestart</span>
          </li>
        )}
      </ul>
    </div>
  );
}
