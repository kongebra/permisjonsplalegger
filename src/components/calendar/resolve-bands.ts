import { startOfDay, addDays, differenceInDays, max, min, isSameDay } from 'date-fns';
import type { LeaveSegment, CustomPeriod, Parent } from '@/lib/types';
import type { PeriodBandData } from './types';
import { getSegmentColor, getPeriodColor, getSegmentPattern } from './colors';

const SEGMENT_LABELS: Record<string, Record<Parent, string>> = {
  preBirth: { mother: 'Mor før termin', father: 'Far før termin' },
  mandatory: { mother: 'Mor obligatorisk', father: 'Far obligatorisk' },
  quota: { mother: 'Mors kvote', father: 'Fars kvote' },
  shared: { mother: 'Fellesperiode (mor)', father: 'Fellesperiode (far)' },
  overlap: { mother: 'Overlapp (mor)', father: 'Overlapp (far)' },
  vacation: { mother: 'Ferie (mor)', father: 'Ferie (far)' },
  unpaid: { mother: 'Ulønnet (mor)', father: 'Ulønnet (far)' },
  gap: { mother: 'Gap', father: 'Gap' },
};

const PERIOD_LABELS: Record<string, Record<Parent, string>> = {
  permisjon: { mother: 'Mor permisjon', father: 'Far permisjon' },
  ferie: { mother: 'Ferie (mor)', father: 'Ferie (far)' },
  ulonnet: { mother: 'Ulønnet (mor)', father: 'Ulønnet (far)' },
  annet: { mother: 'Annet (mor)', father: 'Annet (far)' },
};

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

    const isStart = isSameDay(visibleStart, segmentStart);
    const span = endDayIndex - startDayIndex;
    // Show label at true start if wide enough, or on first Monday continuation
    const showLabel = (isStart && span >= 2) || (!isStart && startDayIndex === 0);

    bands.push({
      id: `segment-${segment.parent}-${segment.type}-${segment.start.toISOString()}`,
      parent: segment.parent,
      type: segment.type,
      startDayIndex,
      endDayIndex,
      isStart,
      isEnd: isSameDay(visibleEnd, segmentEnd),
      color: getSegmentColor(segment.parent, segment.type),
      pattern: getSegmentPattern(segment.type),
      label: SEGMENT_LABELS[segment.type]?.[segment.parent] ?? segment.type,
      showLabel,
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

      const isStart = isSameDay(visibleStart, periodStart);
      const span = endDayIndex - startDayIndex;
      const showLabel = (isStart && span >= 2) || (!isStart && startDayIndex === 0);

      bands.push({
        id: period.id,
        parent: period.parent,
        type: period.type,
        startDayIndex,
        endDayIndex,
        isStart,
        isEnd: isSameDay(visibleEnd, periodEnd),
        color: period.color ? `bg-[${period.color}]` : getPeriodColor(period.parent, period.type),
        pattern: getSegmentPattern(period.type),
        label: period.label || (PERIOD_LABELS[period.type]?.[period.parent] ?? period.type),
        showLabel,
        periodId: period.id,
      });
    }
  }

  return {
    mother: bands.filter((b) => b.parent === 'mother'),
    father: bands.filter((b) => b.parent === 'father'),
  };
}
