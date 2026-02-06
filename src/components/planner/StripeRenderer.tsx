'use client';

import { useMemo } from 'react';
import { startOfDay, addDays, differenceInDays, max, min, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CustomPeriod, LeaveSegment, Parent } from '@/lib/types';

interface StripeRendererProps {
  weekStart: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
}

interface PeriodStripe {
  id: string;
  parent: Parent;
  startDay: number; // 0-6 (Monday-Sunday)
  endDay: number; // 0-6 (Monday-Sunday), exclusive
  isStart: boolean; // Original period starts this week
  isEnd: boolean; // Original period ends this week
  type: string;
  color: string;
}

// Color mapping for segments
const SEGMENT_COLORS: Record<Parent, Record<string, string>> = {
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

const PERIOD_COLORS: Record<Parent, Record<string, string>> = {
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

function getSegmentColor(parent: Parent, type: string): string {
  return SEGMENT_COLORS[parent][type] || 'bg-gray-200';
}

function getPeriodColor(parent: Parent, type: string): string {
  return PERIOD_COLORS[parent][type] || 'bg-gray-200';
}

export function StripeRenderer({ weekStart, segments, customPeriods }: StripeRendererProps) {
  const weekEnd = addDays(weekStart, 7);

  // Collect all stripes for this week
  const stripes = useMemo(() => {
    const result: PeriodStripe[] = [];

    // Process segments
    for (const segment of segments) {
      const segmentStart = startOfDay(segment.start);
      const segmentEnd = startOfDay(segment.end);

      // Skip if segment doesn't overlap this week
      if (segmentEnd <= weekStart || segmentStart >= weekEnd) continue;

      // Calculate visible portion
      const visibleStart = max([segmentStart, weekStart]);
      const visibleEnd = min([segmentEnd, weekEnd]);

      const startDay = differenceInDays(visibleStart, weekStart);
      const endDay = differenceInDays(visibleEnd, weekStart);

      result.push({
        id: `segment-${segment.parent}-${segment.type}-${segment.start.toISOString()}`,
        parent: segment.parent,
        startDay,
        endDay,
        isStart: isSameDay(visibleStart, segmentStart),
        isEnd: isSameDay(visibleEnd, segmentEnd),
        type: segment.type,
        color: getSegmentColor(segment.parent, segment.type),
      });
    }

    // Process custom periods (take priority over segments)
    for (const period of customPeriods) {
      const periodStart = startOfDay(period.startDate);
      const periodEnd = startOfDay(period.endDate);

      // Skip if period doesn't overlap this week
      if (periodEnd <= weekStart || periodStart >= weekEnd) continue;

      // Calculate visible portion
      const visibleStart = max([periodStart, weekStart]);
      const visibleEnd = min([periodEnd, weekEnd]);

      const startDay = differenceInDays(visibleStart, weekStart);
      const endDay = differenceInDays(visibleEnd, weekStart);

      result.push({
        id: period.id,
        parent: period.parent,
        startDay,
        endDay,
        isStart: isSameDay(visibleStart, periodStart),
        isEnd: isSameDay(visibleEnd, periodEnd),
        type: period.type,
        color: period.color ? `bg-[${period.color}]` : getPeriodColor(period.parent, period.type),
      });
    }

    return result;
  }, [weekStart, weekEnd, segments, customPeriods]);

  // Separate stripes by parent
  const motherStripes = stripes.filter((s) => s.parent === 'mother');
  const fatherStripes = stripes.filter((s) => s.parent === 'father');

  // Render a single stripe
  const renderStripe = (stripe: PeriodStripe, isTop: boolean) => {
    const leftPercent = (stripe.startDay / 7) * 100;
    const widthPercent = ((stripe.endDay - stripe.startDay) / 7) * 100;

    return (
      <div
        key={stripe.id}
        className={cn(
          'absolute h-1/2',
          isTop ? 'top-0' : 'bottom-0',
          stripe.color,
          stripe.isStart && 'rounded-l-sm',
          stripe.isEnd && 'rounded-r-sm'
        )}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
      />
    );
  };

  if (motherStripes.length === 0 && fatherStripes.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 h-2 pointer-events-none">
      {motherStripes.map((stripe) => renderStripe(stripe, true))}
      {fatherStripes.map((stripe) => renderStripe(stripe, false))}
    </div>
  );
}
