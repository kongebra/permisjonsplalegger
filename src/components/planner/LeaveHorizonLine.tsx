'use client';

import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  clickRatioToMonth,
  getTimelineGranularity,
  buildTimelineSegments,
} from '@/lib/calculator/dates';
import type { LeaveResult } from '@/lib/types';

interface LeaveHorizonLineProps {
  leaveResult: LeaveResult;
  activeMonth: Date;
  daycareEnabled: boolean;
  daycareDate: Date | null;
  onMonthChange: (month: Date) => void;
}

export function LeaveHorizonLine({
  leaveResult,
  activeMonth,
  daycareEnabled,
  daycareDate,
  onMonthChange,
}: LeaveHorizonLineProps) {
  const leaveStart = leaveResult.mother.start;
  const leaveEnd = leaveResult.father.end;
  const gapEnd = daycareEnabled && daycareDate ? daycareDate : leaveEnd;

  const {
    motherPercent,
    fatherPercent,
    gapPercent,
    currentPercent,
    activeMonthEndPercent,
    totalDays,
    segments,
  } = useMemo(() => {
    const total = Math.max(1, differenceInDays(gapEnd, leaveStart));
    const motherDays = Math.max(0, differenceInDays(leaveResult.mother.end, leaveStart));
    const fatherDays = Math.max(0, differenceInDays(leaveEnd, leaveResult.mother.end));
    const gapDays = Math.max(0, differenceInDays(gapEnd, leaveEnd));

    // Aktiv måneds startposisjon
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(total, differenceInDays(activeStart, leaveStart)));

    // Aktiv måneds sluttposisjon (start av neste måned)
    const nextMonthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
    const activeEndDays = Math.max(0, Math.min(total, differenceInDays(nextMonthStart, leaveStart)));

    // Antall måneder for granularitetsberegning
    const totalMonths =
      (gapEnd.getFullYear() - leaveStart.getFullYear()) * 12 +
      (gapEnd.getMonth() - leaveStart.getMonth()) + 1;

    const granularity = getTimelineGranularity(totalMonths);
    const segs = buildTimelineSegments(leaveStart, gapEnd, granularity);

    return {
      motherPercent: Math.max(0, Math.min(100, (motherDays / total) * 100)),
      fatherPercent: Math.max(0, Math.min(100, (fatherDays / total) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / total) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / total) * 100)),
      activeMonthEndPercent: Math.max(0, Math.min(100, (activeEndDays / total) * 100)),
      totalDays: total,
      segments: segs,
    };
  }, [leaveStart, leaveResult.mother.end, leaveEnd, gapEnd, activeMonth]);

  const activeMonthWidthPercent = activeMonthEndPercent - currentPercent;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onMonthChange(clickRatioToMonth(ratio, leaveStart, totalDays));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = new Date(activeMonth);
      next.setMonth(next.getMonth() + 1);
      onMonthChange(startOfMonth(next));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = new Date(activeMonth);
      prev.setMonth(prev.getMonth() - 1);
      onMonthChange(startOfMonth(prev));
    }
  };

  return (
    // min-h-[44px] sikrer WCAG touch-target
    <div
      role="slider"
      tabIndex={0}
      aria-label="Naviger i permisjonstidslinjen"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(currentPercent)}
      aria-valuetext={format(activeMonth, 'MMMM yyyy', { locale: nb })}
      className="relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded select-none"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Aktiv måneds fremhevede felt — strekker seg over ruler og linje */}
      {activeMonthWidthPercent > 0 && (
        <div
          className="absolute inset-y-0 bg-foreground/8 border-l-2 border-r-2 border-foreground/30 rounded-sm pointer-events-none z-10"
          style={{
            left: `${currentPercent}%`,
            width: `${activeMonthWidthPercent}%`,
          }}
        />
      )}

      {/* Ruler-rad med tikkmerker og etiketter */}
      <div className="relative h-5 mb-0.5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{ left: `${seg.leftPercent}%`, width: `${seg.widthPercent}%` }}
          >
            {/* Tikkemerk ved segment-start */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/20" />
            {/* Etikett sentrert i segmentet */}
            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground leading-none select-none">
              {seg.label}
            </span>
          </div>
        ))}
        {/* Avsluttende tikkemerk */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-foreground/20" />
      </div>

      {/* Farget linje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex mb-2">
        {motherPercent > 0 && (
          <div className="h-full bg-mother-base" style={{ width: `${motherPercent}%` }} />
        )}
        {fatherPercent > 0 && (
          <div className="h-full bg-father-base" style={{ width: `${fatherPercent}%` }} />
        )}
        {gapPercent > 0 && (
          <div
            className="h-full bg-gap border border-dashed border-gap-border"
            style={{ width: `${gapPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
