'use client';

import { cn } from '@/lib/utils';
import type { CalendarDayData } from './types';
import { buildDayTooltip, buildDayAriaLabel } from './resolve-day';

interface DayCellProps {
  day: CalendarDayData;
  interactive?: boolean;
  className?: string;
  statusClassName?: string;
  inlineStyle?: React.CSSProperties;
  onDateSelect?: (date: Date) => void;
  onPointerDown?: (date: Date) => void;
  onPointerEnter?: (date: Date) => void;
  isDragging?: boolean;
}

export function DayCell({
  day,
  interactive = false,
  className,
  statusClassName,
  inlineStyle,
  onDateSelect,
  onPointerDown,
  onPointerEnter,
  isDragging,
}: DayCellProps) {
  const tooltip = buildDayTooltip(day);
  const ariaLabel = buildDayAriaLabel(day);
  const isRedDay = day.isHoliday || day.isSunday;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (day.isLocked && !day.isDueDate) return;
    e.preventDefault();
    onPointerDown?.(day.date);
  };

  const handlePointerEnter = () => {
    if (isDragging) {
      onPointerEnter?.(day.date);
    }
  };

  const handleClick = () => {
    onDateSelect?.(day.date);
  };

  const sharedClasses = cn(
    'relative min-h-[44px] min-w-[44px]',
    'touch-manipulation',
    className,
  );

  // Non-interactive mode (CalendarTimeline): colored cell with day number
  if (!interactive) {
    return (
      <div
        className={cn(
          'aspect-square rounded-sm flex items-center justify-center text-xs',
          statusClassName,
          isRedDay && 'text-red-600 dark:text-red-400 font-bold',
          day.isDueDate && 'ring-2 ring-violet-500 ring-inset font-bold',
          day.isDaycareStart && 'ring-2 ring-emerald-500 ring-inset font-bold',
          onDateSelect && 'cursor-pointer',
          sharedClasses,
        )}
        style={inlineStyle}
        title={tooltip}
        role="gridcell"
        aria-label={ariaLabel}
        onClick={onDateSelect ? handleClick : undefined}
      >
        {day.dayOfMonth}
      </div>
    );
  }

  // Interactive mode (PlannerCalendar): button with selection state
  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      disabled={day.isLocked && !day.isDueDate}
      title={tooltip}
      aria-label={ariaLabel}
      role="gridcell"
      className={cn(
        'w-full aspect-square p-0.5 text-sm transition-colors touch-none',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
        !day.isCurrentMonth && 'opacity-30',
        day.isToday && !day.isDueDate && !day.isDaycareStart && 'ring-2 ring-primary ring-inset',
        day.isDueDate && 'ring-2 ring-violet-500 ring-inset',
        day.isDaycareStart && !day.isDueDate && 'ring-2 ring-emerald-500 ring-inset',
        day.isSelected && 'bg-primary/20',
        day.isInSelection && !day.isSelected && 'bg-primary/10',
        day.isSelectionStart && 'rounded-l-lg',
        day.isSelectionEnd && 'rounded-r-lg',
        day.isLocked && 'cursor-not-allowed opacity-70',
        !day.isLocked && 'hover:bg-muted/50',
        sharedClasses,
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-1 text-xs font-medium z-10',
          (day.isHoliday || day.isSunday) && 'text-red-600',
          day.isSaturday && !day.isHoliday && 'text-muted-foreground',
          day.isDueDate && 'text-violet-600 font-bold',
          day.isDaycareStart && !day.isDueDate && 'text-emerald-600 font-bold',
        )}
      >
        {day.dayOfMonth}
      </span>
    </button>
  );
}
