'use client';

import { addMonths, subMonths } from 'date-fns';
import { MiniMonth } from './MiniMonth';
import type { LeaveSegment, CustomPeriod } from '@/lib/types';

interface MiniMonthStripProps {
  activeMonth: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  dueDate: Date;
  daycareStart?: Date;
  onMonthSelect: (month: Date) => void;
}

export function MiniMonthStrip({
  activeMonth,
  segments,
  customPeriods,
  dueDate,
  daycareStart,
  onMonthSelect,
}: MiniMonthStripProps) {
  const prevMonth = subMonths(activeMonth, 1);
  const nextMonth = addMonths(activeMonth, 1);

  return (
    <div className="grid grid-cols-3 gap-1">
      <div className="opacity-60 scale-95 origin-left">
        <MiniMonth
          month={prevMonth}
          dueDate={dueDate}
          daycareStart={daycareStart}
          segments={segments}
          customPeriods={customPeriods}
          isActive={false}
          onClick={() => onMonthSelect(prevMonth)}
        />
      </div>
      <MiniMonth
        month={activeMonth}
        dueDate={dueDate}
        daycareStart={daycareStart}
        segments={segments}
        customPeriods={customPeriods}
        isActive={true}
        onClick={() => {}}
      />
      <div className="opacity-60 scale-95 origin-right">
        <MiniMonth
          month={nextMonth}
          dueDate={dueDate}
          daycareStart={daycareStart}
          segments={segments}
          customPeriods={customPeriods}
          isActive={false}
          onClick={() => onMonthSelect(nextMonth)}
        />
      </div>
    </div>
  );
}
