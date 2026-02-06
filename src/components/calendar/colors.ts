import type { Parent, LeaveSegmentType, PlannerPeriodType } from '@/lib/types';

/**
 * Centralized color system for calendar components.
 * Single source of truth — both CalendarTimeline and PlannerCalendar consume these.
 */

// Parent base colors (used for solid leave periods)
export const PARENT_COLORS: Record<Parent, { bg: string; darkBg: string; border: string }> = {
  mother: {
    bg: 'bg-pink-300',
    darkBg: 'dark:bg-pink-500',
    border: 'rgb(190, 24, 93)',
  },
  father: {
    bg: 'bg-blue-300',
    darkBg: 'dark:bg-blue-500',
    border: 'rgb(30, 64, 175)',
  },
};

// Segment type → Tailwind color class (for PeriodBandRenderer stripes)
export const SEGMENT_COLORS: Record<Parent, Record<string, string>> = {
  mother: {
    preBirth: 'bg-pink-300',
    mandatory: 'bg-pink-400',
    quota: 'bg-pink-300',
    shared: 'bg-pink-200',
    overlap: 'bg-pink-200',
    vacation: 'bg-pink-100',
    unpaid: 'bg-gray-200',
    gap: 'bg-orange-200',
  },
  father: {
    preBirth: 'bg-blue-300',
    mandatory: 'bg-blue-400',
    quota: 'bg-blue-300',
    shared: 'bg-blue-200',
    overlap: 'bg-blue-200',
    vacation: 'bg-blue-100',
    unpaid: 'bg-gray-200',
    gap: 'bg-orange-200',
  },
};

// Planner period type → Tailwind color class
export const PERIOD_COLORS: Record<Parent, Record<string, string>> = {
  mother: {
    permisjon: 'bg-pink-300',
    ferie: 'bg-pink-100',
    ulonnet: 'bg-gray-200',
    annet: 'bg-purple-200',
  },
  father: {
    permisjon: 'bg-blue-300',
    ferie: 'bg-blue-100',
    ulonnet: 'bg-gray-200',
    annet: 'bg-purple-200',
  },
};

// Timeline day-cell status colors (for full-cell coloring in CalendarTimeline)
export const STATUS_COLORS = {
  mother: 'bg-pink-300 dark:bg-pink-500',
  father: 'bg-blue-300 dark:bg-blue-500',
  motherVacation: 'bg-pink-300 dark:bg-pink-500',
  fatherVacation: 'bg-blue-300 dark:bg-blue-500',
  motherVacationOverlapFather: '',
  fatherVacationOverlapMother: '',
  overlap: '',
  gap: 'bg-red-200 dark:bg-red-900/50 border border-dashed border-red-400',
  duedate: 'bg-violet-500 dark:bg-violet-600 text-white font-bold',
  daycare: 'bg-green-500 dark:bg-green-600 text-white font-bold',
  daycareWithMotherVacation: 'bg-green-500 dark:bg-green-600 text-white font-bold',
  daycareWithFatherVacation: 'bg-green-500 dark:bg-green-600 text-white font-bold',
  unpaid: 'bg-gray-200 dark:bg-gray-700',
  normal: 'bg-muted',
} as const;

export type DayStatus = keyof typeof STATUS_COLORS;

// Inline styles for gradient/border effects that can't be done with Tailwind classes alone
export function getOverlapStyle(): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, rgb(249, 168, 212) 50%, rgb(147, 197, 253) 50%)`,
  };
}

export function getVacationFullBorderStyle(parent: Parent): React.CSSProperties {
  return { border: `2px dashed ${PARENT_COLORS[parent].border}` };
}

export function getVacationHalfBorderStyle(parent: Parent): React.CSSProperties {
  if (parent === 'mother') {
    return {
      background: `linear-gradient(135deg, rgb(249, 168, 212) 50%, rgb(147, 197, 253) 50%)`,
      borderLeft: `2px dashed ${PARENT_COLORS.mother.border}`,
      borderTop: `2px dashed ${PARENT_COLORS.mother.border}`,
    };
  }
  return {
    background: `linear-gradient(135deg, rgb(249, 168, 212) 50%, rgb(147, 197, 253) 50%)`,
    borderRight: `2px dashed ${PARENT_COLORS.father.border}`,
    borderBottom: `2px dashed ${PARENT_COLORS.father.border}`,
  };
}

export function getUnpaidStyle(): React.CSSProperties {
  return { border: '2px dashed rgb(107, 114, 128)' };
}

// Get inline style for a given day status (used by CalendarTimeline DayCell)
export function getDayStatusStyle(status: DayStatus): React.CSSProperties | undefined {
  switch (status) {
    case 'overlap':
      return getOverlapStyle();
    case 'motherVacation':
      return getVacationFullBorderStyle('mother');
    case 'fatherVacation':
      return getVacationFullBorderStyle('father');
    case 'motherVacationOverlapFather':
      return getVacationHalfBorderStyle('mother');
    case 'fatherVacationOverlapMother':
      return getVacationHalfBorderStyle('father');
    case 'daycareWithMotherVacation':
      return getVacationFullBorderStyle('mother');
    case 'daycareWithFatherVacation':
      return getVacationFullBorderStyle('father');
    case 'unpaid':
      return getUnpaidStyle();
    default:
      return undefined;
  }
}

// Pattern for a given segment type (for colorblind accessibility)
export function getSegmentPattern(type: LeaveSegmentType | PlannerPeriodType): 'solid' | 'dashed' | 'hatched' {
  switch (type) {
    case 'vacation':
    case 'ferie':
      return 'dashed';
    case 'unpaid':
    case 'ulonnet':
      return 'hatched';
    default:
      return 'solid';
  }
}

// Get color for a segment
export function getSegmentColor(parent: Parent, type: string): string {
  return SEGMENT_COLORS[parent][type] || 'bg-gray-200';
}

// Get color for a custom period
export function getPeriodColor(parent: Parent, type: string): string {
  return PERIOD_COLORS[parent][type] || 'bg-gray-200';
}
