import type { Parent, LeaveSegmentType, PlannerPeriodType } from '@/lib/types';

/**
 * Centralized color system for calendar components.
 * Single source of truth — both CalendarTimeline and PlannerCalendar consume these.
 * Uses semantic CSS variables defined in globals.css.
 */

// Parent base colors (used for solid leave periods)
export const PARENT_COLORS: Record<Parent, { bg: string; darkBg: string; border: string }> = {
  mother: {
    bg: 'bg-mother-base',
    darkBg: 'dark:bg-mother-strong',
    border: 'var(--color-mother-strong)',
  },
  father: {
    bg: 'bg-father-base',
    darkBg: 'dark:bg-father-strong',
    border: 'var(--color-father-strong)',
  },
};

// Segment type → Tailwind color class (for PeriodBandRenderer stripes)
export const SEGMENT_COLORS: Record<Parent, Record<string, string>> = {
  mother: {
    preBirth: 'bg-mother-base',
    mandatory: 'bg-mother-strong',
    quota: 'bg-mother-base',
    shared: 'bg-mother-light',
    overlap: 'bg-mother-light',
    vacation: 'bg-mother-light',
    unpaid: 'bg-unpaid',
    gap: 'bg-gap',
  },
  father: {
    preBirth: 'bg-father-base',
    mandatory: 'bg-father-strong',
    quota: 'bg-father-base',
    shared: 'bg-father-light',
    overlap: 'bg-father-light',
    vacation: 'bg-father-light',
    unpaid: 'bg-unpaid',
    gap: 'bg-gap',
  },
};

// Planner period type → Tailwind color class
export const PERIOD_COLORS: Record<Parent, Record<string, string>> = {
  mother: {
    permisjon: 'bg-mother-base',
    ferie: 'bg-mother-light',
    ulonnet: 'bg-unpaid',
    annet: 'bg-shared-light',
  },
  father: {
    permisjon: 'bg-father-base',
    ferie: 'bg-father-light',
    ulonnet: 'bg-unpaid',
    annet: 'bg-shared-light',
  },
};

// Timeline day-cell status colors (for full-cell coloring in CalendarTimeline)
export const STATUS_COLORS = {
  mother: 'bg-mother-base dark:bg-mother-strong',
  father: 'bg-father-base dark:bg-father-strong',
  motherVacation: 'bg-mother-base dark:bg-mother-strong',
  fatherVacation: 'bg-father-base dark:bg-father-strong',
  motherVacationOverlapFather: '',
  fatherVacationOverlapMother: '',
  overlap: '',
  gap: 'bg-gap dark:bg-gap border border-dashed border-gap-border',
  duedate: 'bg-duedate text-white font-bold',
  daycare: 'bg-daycare text-white font-bold',
  daycareWithMotherVacation: 'bg-daycare text-white font-bold',
  daycareWithFatherVacation: 'bg-daycare text-white font-bold',
  unpaid: 'bg-unpaid dark:bg-unpaid',
  normal: 'bg-muted',
} as const;

export type DayStatus = keyof typeof STATUS_COLORS;

// Inline styles for gradient/border effects that can't be done with Tailwind classes alone
export function getOverlapStyle(): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, var(--color-mother-base) 50%, var(--color-father-base) 50%)`,
  };
}

export function getVacationFullBorderStyle(parent: Parent): React.CSSProperties {
  return { border: `2px dashed ${PARENT_COLORS[parent].border}` };
}

export function getVacationHalfBorderStyle(parent: Parent): React.CSSProperties {
  if (parent === 'mother') {
    return {
      background: `linear-gradient(135deg, var(--color-mother-base) 50%, var(--color-father-base) 50%)`,
      borderLeft: `2px dashed ${PARENT_COLORS.mother.border}`,
      borderTop: `2px dashed ${PARENT_COLORS.mother.border}`,
    };
  }
  return {
    background: `linear-gradient(135deg, var(--color-mother-base) 50%, var(--color-father-base) 50%)`,
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
  return SEGMENT_COLORS[parent][type] || 'bg-unpaid';
}

// Get color for a custom period
export function getPeriodColor(parent: Parent, type: string): string {
  return PERIOD_COLORS[parent][type] || 'bg-unpaid';
}
