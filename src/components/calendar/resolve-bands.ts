import { startOfDay, addDays, differenceInDays, max, min, isSameDay } from 'date-fns';
import type { LeaveSegment, CustomPeriod } from '@/lib/types';
import type { PeriodBandData } from './types';
import { getSegmentColor, getPeriodColor, getSegmentPattern } from './colors';

/**
 * Pure function: resolve period bands for a single week.
 * Returns mother and father bands separately for stacked rendering.
 *
 * Extracted from planner/StripeRenderer.tsx useMemo logic.
 */
export function resolveBands(
  weekStart: Date,
  segments: LeaveSegment[],
  customPeriods?: CustomPeriod[],
): { mother: PeriodBandData[]; father: PeriodBandData[] } {
  const weekEnd = addDays(weekStart, 7);
  const bands: PeriodBandData[] = [];

  // Process segments
  for (const segment of segments) {
    const segmentStart = startOfDay(segment.start);
    const segmentEnd = startOfDay(segment.end);

    if (segmentEnd <= weekStart || segmentStart >= weekEnd) continue;

    const visibleStart = max([segmentStart, weekStart]);
    const visibleEnd = min([segmentEnd, weekEnd]);

    const startDayIndex = differenceInDays(visibleStart, weekStart);
    const endDayIndex = differenceInDays(visibleEnd, weekStart);

    bands.push({
      id: `segment-${segment.parent}-${segment.type}-${segment.start.toISOString()}`,
      parent: segment.parent,
      type: segment.type,
      startDayIndex,
      endDayIndex,
      isStart: isSameDay(visibleStart, segmentStart),
      isEnd: isSameDay(visibleEnd, segmentEnd),
      color: getSegmentColor(segment.parent, segment.type),
      pattern: getSegmentPattern(segment.type),
      label: segment.type,
    });
  }

  // Process custom periods (visual priority over segments)
  if (customPeriods) {
    for (const period of customPeriods) {
      const periodStart = startOfDay(period.startDate);
      const periodEnd = startOfDay(period.endDate);

      if (periodEnd <= weekStart || periodStart >= weekEnd) continue;

      const visibleStart = max([periodStart, weekStart]);
      const visibleEnd = min([periodEnd, weekEnd]);

      const startDayIndex = differenceInDays(visibleStart, weekStart);
      const endDayIndex = differenceInDays(visibleEnd, weekStart);

      bands.push({
        id: period.id,
        parent: period.parent,
        type: period.type,
        startDayIndex,
        endDayIndex,
        isStart: isSameDay(visibleStart, periodStart),
        isEnd: isSameDay(visibleEnd, periodEnd),
        color: period.color ? `bg-[${period.color}]` : getPeriodColor(period.parent, period.type),
        pattern: getSegmentPattern(period.type),
        label: period.label || period.type,
        periodId: period.id,
      });
    }
  }

  return {
    mother: bands.filter((b) => b.parent === 'mother'),
    father: bands.filter((b) => b.parent === 'father'),
  };
}
