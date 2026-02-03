'use client';

import { useMemo } from 'react';
import { format, differenceInWeeks } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { LeaveResult, LeaveSegment } from '@/lib/types';

interface GanttTimelineProps {
  result: LeaveResult;
  showFather: boolean;
}

const segmentColors: Record<string, { bg: string; border: string }> = {
  preBirth: { bg: 'bg-pink-200 dark:bg-pink-800', border: 'border-pink-400' },
  mandatory: { bg: 'bg-pink-300 dark:bg-pink-700', border: 'border-pink-500' },
  quota: { bg: 'bg-pink-400 dark:bg-pink-600', border: 'border-pink-600' },
  shared: { bg: 'bg-purple-300 dark:bg-purple-700', border: 'border-purple-500' },
  overlap: {
    bg: 'bg-gradient-to-r from-pink-400 to-blue-400 dark:from-pink-600 dark:to-blue-600',
    border: 'border-purple-500',
  },
  vacation: { bg: 'bg-green-300 dark:bg-green-700', border: 'border-green-500' },
  unpaid: { bg: 'bg-gray-300 dark:bg-gray-700', border: 'border-gray-500' },
  gap: {
    bg: 'bg-red-100 dark:bg-red-900/30 border-dashed',
    border: 'border-red-400',
  },
};

const segmentLabels: Record<string, string> = {
  preBirth: 'Før fødsel',
  mandatory: 'Obligatorisk',
  quota: 'Kvote',
  shared: 'Fellesperiode',
  overlap: 'Overlapp',
  vacation: 'Ferie',
  unpaid: 'Ulønnet',
  gap: 'Gap',
};

function SegmentBar({
  segment,
  startWeek,
  totalWeeks,
}: {
  segment: LeaveSegment;
  startWeek: number;
  totalWeeks: number;
}) {
  const width = (segment.weeks / totalWeeks) * 100;
  const left = (startWeek / totalWeeks) * 100;
  const colors = segmentColors[segment.type] || segmentColors.quota;
  const isFather = segment.parent === 'father';

  return (
    <div
      className={`absolute h-8 rounded ${colors.bg} ${colors.border} border flex items-center justify-center text-xs font-medium overflow-hidden`}
      style={{
        width: `${width}%`,
        left: `${left}%`,
        top: isFather ? '40px' : '0px',
      }}
      title={`${segmentLabels[segment.type]}: ${segment.weeks} uker`}
    >
      {width > 10 && (
        <span className="truncate px-1">
          {segmentLabels[segment.type]} ({segment.weeks}u)
        </span>
      )}
    </div>
  );
}

export function GanttTimeline({ result, showFather }: GanttTimelineProps) {
  const { segments, gap } = result;

  // Beregn total lengde i uker (fra første segment start til barnehagestart)
  const timelineData = useMemo(() => {
    if (segments.length === 0) return { totalWeeks: 0, startDate: new Date() };

    const startDate = segments[0].start;
    const endDate = gap.end;
    const totalWeeks = Math.max(1, differenceInWeeks(endDate, startDate));

    return { totalWeeks, startDate };
  }, [segments, gap]);

  const { totalWeeks, startDate } = timelineData;

  // Grupper segmenter per forelder
  const motherSegments = segments.filter((s) => s.parent === 'mother');
  const fatherSegments = segments.filter((s) => s.parent === 'father');

  // Beregn startuke for hvert segment
  const getStartWeek = (segment: LeaveSegment) => {
    return differenceInWeeks(segment.start, startDate);
  };

  // Lag gap-segment
  const gapSegment: LeaveSegment | null =
    gap.weeks > 0
      ? {
          parent: 'mother', // Vises på egen rad
          type: 'gap',
          start: gap.start,
          end: gap.end,
          weeks: gap.weeks,
        }
      : null;

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Tidslinje</h3>

      {/* Timeline container */}
      <div className="relative rounded-lg border p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* X-akse labels */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{format(startDate, 'MMM yyyy', { locale: nb })}</span>
            <span>{format(gap.end, 'MMM yyyy', { locale: nb })}</span>
          </div>

          {/* Bars */}
          <div
            className="relative"
            style={{ height: showFather ? '100px' : '60px' }}
          >
            {/* Mor label */}
            <div className="absolute -left-12 top-1 text-xs font-medium text-pink-600 dark:text-pink-400">
              Mor
            </div>

            {/* Mor segments */}
            {motherSegments.map((segment, i) => (
              <SegmentBar
                key={`mother-${i}`}
                segment={segment}
                startWeek={getStartWeek(segment)}
                totalWeeks={totalWeeks}
              />
            ))}

            {/* Far label og segments */}
            {showFather && (
              <>
                <div className="absolute -left-12 top-11 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Far
                </div>
                {fatherSegments.map((segment, i) => (
                  <SegmentBar
                    key={`father-${i}`}
                    segment={segment}
                    startWeek={getStartWeek(segment)}
                    totalWeeks={totalWeeks}
                  />
                ))}
              </>
            )}

            {/* Gap */}
            {gapSegment && (
              <div
                className={`absolute h-full rounded border-2 border-dashed border-red-400 bg-red-100/50 dark:bg-red-900/20 flex items-center justify-center`}
                style={{
                  width: `${(gapSegment.weeks / totalWeeks) * 100}%`,
                  left: `${(getStartWeek(gapSegment) / totalWeeks) * 100}%`,
                  top: showFather ? '80px' : '40px',
                  height: '20px',
                }}
                title={`Gap: ${gap.weeks} uker (${gap.days} dager)`}
              >
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Gap: {gap.days} dager
                </span>
              </div>
            )}
          </div>

          {/* Barnehagestart markør */}
          <div className="flex justify-end mt-2">
            <span className="text-xs text-muted-foreground">
              Barnehagestart: {format(gap.end, 'd. MMM yyyy', { locale: nb })}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-pink-400 dark:bg-pink-600" />
          <span>Mors kvote</span>
        </div>
        {showFather && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-600" />
            <span>Fars kvote</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-300 dark:bg-purple-700" />
          <span>Fellesperiode</span>
        </div>
        {gap.days > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-dashed border-red-400 bg-red-100 dark:bg-red-900/30" />
            <span>Gap</span>
          </div>
        )}
      </div>
    </div>
  );
}
