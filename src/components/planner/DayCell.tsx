'use client';

import { cn } from '@/lib/utils';
import { isWeekend, startOfDay } from 'date-fns';
import type { CustomPeriod, LeaveSegment } from '@/lib/types';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isDueDate: boolean;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  isSelected: boolean;
  isInSelection: boolean;
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  isLocked: boolean;
  onClick: (date: Date) => void;
}

// Color mapping for parents and segment types
const SEGMENT_COLORS = {
  mother: {
    preBirth: 'bg-pink-300',
    mandatory: 'bg-pink-400',
    quota: 'bg-pink-300',
    shared: 'bg-pink-200',
    overlap: 'bg-pink-200',
    vacation: 'bg-pink-100 border-pink-300 border-dashed border',
    unpaid: 'bg-gray-200 border-gray-400 border-dashed border',
    gap: 'bg-orange-200',
  },
  father: {
    preBirth: 'bg-blue-300',
    mandatory: 'bg-blue-400',
    quota: 'bg-blue-300',
    shared: 'bg-blue-200',
    overlap: 'bg-blue-200',
    vacation: 'bg-blue-100 border-blue-300 border-dashed border',
    unpaid: 'bg-gray-200 border-gray-400 border-dashed border',
    gap: 'bg-orange-200',
  },
} as const;

const PERIOD_COLORS = {
  mother: {
    permisjon: 'bg-pink-300',
    ferie: 'bg-pink-100 border-pink-300 border-dashed border',
    ulonnet: 'bg-gray-200 border-gray-400 border-dashed border',
    annet: 'bg-purple-200',
  },
  father: {
    permisjon: 'bg-blue-300',
    ferie: 'bg-blue-100 border-blue-300 border-dashed border',
    ulonnet: 'bg-gray-200 border-gray-400 border-dashed border',
    annet: 'bg-purple-200',
  },
} as const;

function getSegmentColor(segment: LeaveSegment): string {
  const parentColors = SEGMENT_COLORS[segment.parent];
  return parentColors[segment.type] || 'bg-gray-200';
}

function getPeriodColor(period: CustomPeriod): string {
  if (period.color) {
    return `bg-[${period.color}]`;
  }
  const parentColors = PERIOD_COLORS[period.parent];
  return parentColors[period.type] || 'bg-gray-200';
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isHoliday,
  holidayName,
  isDueDate,
  segments,
  customPeriods,
  isSelected,
  isInSelection,
  isSelectionStart,
  isSelectionEnd,
  isLocked,
  onClick,
}: DayCellProps) {
  const dayOfMonth = date.getDate();
  const weekend = isWeekend(date);
  const normalizedDate = startOfDay(date);

  // Find segments that cover this day
  const daySegments = segments.filter(
    (s) => normalizedDate >= startOfDay(s.start) && normalizedDate < startOfDay(s.end)
  );

  // Find custom periods that cover this day
  const dayPeriods = customPeriods.filter(
    (p) => normalizedDate >= startOfDay(p.startDate) && normalizedDate < startOfDay(p.endDate)
  );

  // Get primary colors for display
  const motherSegment = daySegments.find((s) => s.parent === 'mother');
  const fatherSegment = daySegments.find((s) => s.parent === 'father');
  const motherPeriod = dayPeriods.find((p) => p.parent === 'mother');
  const fatherPeriod = dayPeriods.find((p) => p.parent === 'father');

  // Priority: custom periods > segments
  const showMother = motherPeriod || motherSegment;
  const showFather = fatherPeriod || fatherSegment;
  const hasBoth = showMother && showFather;

  return (
    <button
      onClick={() => onClick(date)}
      disabled={isLocked && !isDueDate}
      title={holidayName || (isDueDate ? 'Termindato' : undefined)}
      className={cn(
        'relative w-full aspect-square p-0.5 text-sm transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
        !isCurrentMonth && 'opacity-30',
        isToday && 'ring-2 ring-primary ring-inset',
        isDueDate && 'ring-2 ring-red-500 ring-inset',
        isSelected && 'bg-primary/20',
        isInSelection && !isSelected && 'bg-primary/10',
        isSelectionStart && 'rounded-l-lg',
        isSelectionEnd && 'rounded-r-lg',
        isLocked && 'cursor-not-allowed opacity-70',
        !isLocked && 'hover:bg-muted/50'
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'absolute top-0.5 left-1 text-xs font-medium z-10',
          isHoliday && 'text-red-600',
          weekend && !isHoliday && 'text-muted-foreground',
          isDueDate && 'text-red-600 font-bold'
        )}
      >
        {dayOfMonth}
      </span>

      {/* Period visualization */}
      <div className="absolute inset-1 top-4 flex flex-col gap-0.5 overflow-hidden">
        {hasBoth ? (
          // Split view for both parents
          <div className="flex-1 flex gap-0.5">
            <div
              className={cn(
                'flex-1 rounded-sm',
                motherPeriod ? getPeriodColor(motherPeriod) : motherSegment ? getSegmentColor(motherSegment) : ''
              )}
            />
            <div
              className={cn(
                'flex-1 rounded-sm',
                fatherPeriod ? getPeriodColor(fatherPeriod) : fatherSegment ? getSegmentColor(fatherSegment) : ''
              )}
            />
          </div>
        ) : showMother ? (
          <div
            className={cn(
              'flex-1 rounded-sm',
              motherPeriod ? getPeriodColor(motherPeriod) : motherSegment ? getSegmentColor(motherSegment) : ''
            )}
          />
        ) : showFather ? (
          <div
            className={cn(
              'flex-1 rounded-sm',
              fatherPeriod ? getPeriodColor(fatherPeriod) : fatherSegment ? getSegmentColor(fatherSegment) : ''
            )}
          />
        ) : null}
      </div>

      {/* Locked indicator */}
      {isLocked && (
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-gray-600 rounded-full" />
      )}
    </button>
  );
}
