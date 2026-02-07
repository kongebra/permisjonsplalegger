import type { Parent, LeaveSegmentType, PlannerPeriodType } from '@/lib/types';

export interface CalendarDayPeriod {
  id: string;
  parent: Parent;
  type: LeaveSegmentType | PlannerPeriodType;
  pattern: 'solid' | 'dashed' | 'hatched';
  label: string;
}

export interface CalendarDayData {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
  isDueDate: boolean;
  isDaycareStart: boolean;
  isGapDay: boolean;
  periods: CalendarDayPeriod[];
  // Interaction state (only relevant in interactive mode)
  isSelected?: boolean;
  isInSelection?: boolean;
  isSelectionStart?: boolean;
  isSelectionEnd?: boolean;
  isLocked?: boolean;
}

export interface PeriodBandData {
  id: string;
  parent: Parent;
  type: string;
  startDayIndex: number; // 0-6 within the week
  endDayIndex: number; // 0-6, exclusive
  isStart: boolean;
  isEnd: boolean;
  color: string; // Tailwind class
  inlineStyle?: React.CSSProperties;
  pattern: 'solid' | 'dashed' | 'hatched';
  label: string;
  showLabel: boolean;
  periodId?: string; // For onPeriodSelect
}

export interface LegendItem {
  id: string;
  color: string;
  pattern: 'solid' | 'dashed' | 'hatched';
  label: string;
  inlineStyle?: React.CSSProperties;
}

export interface MonthGridCallbacks {
  onDateSelect?: (date: Date) => void;
  onPointerDown?: (date: Date) => void;
  onPointerEnter?: (date: Date) => void;
  onPeriodSelect?: (periodId: string) => void;
}
