'use client';

import { cn } from '@/lib/utils';
import type { CalendarDayData } from './types';
import { buildDayTooltip, buildDayAriaLabel } from './resolve-day';

interface DayCellProps {
  day: CalendarDayData;
  interactive?: boolean;
  pickerMode?: boolean;
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
  pickerMode = false,
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

  // Picker mode: Momondo-style cells with layered visual hierarchy
  if (pickerMode) {
    const hasMother = day.periods.some((p) => p.parent === 'mother');
    const hasFather = day.periods.some((p) => p.parent === 'father');
    const hasStrip = hasMother || hasFather || day.isGapDay;

    return (
      <button
        onClick={handleClick}
        aria-label={ariaLabel}
        role="gridcell"
        className={cn(
          'relative h-[44px] w-full flex items-center justify-center text-sm',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
          !day.isCurrentMonth && 'opacity-30',
          // Range fill — semi-transparent, edge-to-edge
          day.isInSelection && !day.isSelected && 'bg-duedate/12',
          // Range rounding (pill shape)
          day.isSelectionStart && !day.isSelectionEnd && 'rounded-l-full',
          day.isSelectionEnd && !day.isSelectionStart && 'rounded-r-full',
          day.isSelectionStart && day.isSelectionEnd && 'rounded-full',
          // Subtle hover only when not selected
          !day.isSelected && !day.isInSelection && 'hover:bg-muted/40',
        )}
      >
        {/* Selected date circle (start/end handles) */}
        {day.isSelected && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-foreground" />
        )}

        {/* Range tint behind circle for start/end cells */}
        {day.isSelected && day.isInSelection && (
          <span
            className={cn(
              'absolute inset-0 bg-duedate/12',
              day.isSelectionStart && !day.isSelectionEnd && 'rounded-l-full',
              day.isSelectionEnd && !day.isSelectionStart && 'rounded-r-full',
            )}
          />
        )}

        {/* Dot markers for dueDate and daycareStart */}
        {day.isDueDate && !day.isSelected && (
          <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-duedate z-10" />
        )}
        {day.isDaycareStart && !day.isDueDate && !day.isSelected && (
          <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-daycare z-10" />
        )}

        {/* Day number — centered */}
        <span
          className={cn(
            'relative z-10 text-[13px] leading-none',
            // Selected: white on dark circle
            day.isSelected && 'text-background font-bold',
            // Not selected: color hierarchy
            !day.isSelected && day.isSaturday && !day.isHoliday && 'text-muted-foreground/70',
            !day.isSelected && (day.isSunday || day.isHoliday) && 'text-destructive',
            !day.isSelected && day.isDueDate && 'text-duedate font-semibold',
            !day.isSelected && day.isDaycareStart && !day.isDueDate && 'text-daycare font-semibold',
          )}
        >
          {day.dayOfMonth}
        </span>

        {/* Period strip at bottom — thin colored bar */}
        {hasStrip && (
          <span
            className={cn(
              'absolute bottom-0 left-0 right-0 h-[3px]',
              day.isGapDay && 'bg-gap/50 border-t border-dashed border-gap-border/40',
              !day.isGapDay && hasMother && !hasFather && 'bg-mother-base/50',
              !day.isGapDay && hasFather && !hasMother && 'bg-father-base/50',
              !day.isGapDay && hasMother && hasFather && 'bg-gradient-to-r from-mother-base/50 to-father-base/50',
            )}
          />
        )}
      </button>
    );
  }

  // Non-interactive mode (CalendarTimeline): colored cell with day number
  if (!interactive) {
    const isClickable = !!onDateSelect;
    return (
      <div
        className={cn(
          'aspect-square rounded-sm flex items-center justify-center text-xs',
          statusClassName,
          isRedDay && 'text-destructive font-bold',
          day.isDueDate && 'ring-2 ring-duedate ring-inset font-bold',
          day.isDaycareStart && 'ring-2 ring-daycare ring-inset font-bold',
          isClickable && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          sharedClasses,
        )}
        style={inlineStyle}
        title={tooltip}
        role="gridcell"
        tabIndex={isClickable ? 0 : -1}
        aria-label={ariaLabel}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        } : undefined}
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
        day.isDueDate && 'ring-2 ring-duedate ring-inset',
        day.isDaycareStart && !day.isDueDate && 'ring-2 ring-daycare ring-inset',
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
          (day.isHoliday || day.isSunday) && 'text-destructive',
          day.isSaturday && !day.isHoliday && 'text-muted-foreground',
          day.isDueDate && 'text-duedate font-bold',
          day.isDaycareStart && !day.isDueDate && 'text-daycare font-bold',
        )}
      >
        {day.dayOfMonth}
      </span>
    </button>
  );
}
