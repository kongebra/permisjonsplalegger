'use client';

import { cn } from '@/lib/utils';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isDueDate: boolean;
  isSelected: boolean;
  isInSelection: boolean;
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  isLocked: boolean;
  isDragging?: boolean;
  onPointerDown?: (date: Date) => void;
  onPointerEnter?: (date: Date) => void;
  onClick: (date: Date) => void;
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isHoliday,
  holidayName,
  isDueDate,
  isSelected,
  isInSelection,
  isSelectionStart,
  isSelectionEnd,
  isLocked,
  isDragging,
  onPointerDown,
  onPointerEnter,
  onClick,
}: DayCellProps) {
  const dayOfMonth = date.getDate();
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked && !isDueDate) return;
    e.preventDefault();
    onPointerDown?.(date);
  };

  const handlePointerEnter = () => {
    if (isDragging) {
      onPointerEnter?.(date);
    }
  };

  return (
    <button
      onClick={() => onClick(date)}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      disabled={isLocked && !isDueDate}
      title={holidayName || (isDueDate ? 'Termindato' : undefined)}
      className={cn(
        'relative w-full aspect-square p-0.5 text-sm transition-colors touch-none',
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
      {/* Day number - red text for Sundays and holidays */}
      <span
        className={cn(
          'absolute top-0.5 left-1 text-xs font-medium z-10',
          (isHoliday || isSunday) && 'text-red-600',
          isSaturday && !isHoliday && 'text-muted-foreground',
          isDueDate && 'text-red-600 font-bold'
        )}
      >
        {dayOfMonth}
      </span>
    </button>
  );
}
