import type { Parent, LeaveSegmentType, PlannerPeriodType } from '@/lib/types';

/**
 * Centralized color system for calendar components.
 * Single source of truth for fargene i kalender og periodevelger.
 * Uses semantic CSS variables defined in globals.css.
 */

// Segment type → Tailwind color class (for PeriodBandRenderer stripes)
const SEGMENT_COLORS: Record<Parent, Record<string, string>> = {
  mother: {
    preBirth: 'bg-mother-base',
    mandatory: 'bg-mother-strong',
    quota: 'bg-mother-base',
    shared: 'bg-mother-light',
    overlap: 'bg-mother-light',
    'activity-required': 'bg-mother-base',
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
    'activity-required': 'bg-father-base',
    vacation: 'bg-father-light',
    unpaid: 'bg-unpaid',
    gap: 'bg-gap',
  },
};

// Planner period type → Tailwind color class
const PERIOD_COLORS: Record<Parent, Record<string, string>> = {
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
