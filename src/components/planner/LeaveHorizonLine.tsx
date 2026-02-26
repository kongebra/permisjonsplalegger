'use client';

import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import { clickRatioToMonth } from '@/lib/calculator/dates';
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

  const { motherPercent, fatherPercent, gapPercent, currentPercent, totalDays } = useMemo(() => {
    const total = Math.max(1, differenceInDays(gapEnd, leaveStart));
    const motherDays = Math.max(0, differenceInDays(leaveResult.mother.end, leaveStart));
    const fatherDays = Math.max(0, differenceInDays(leaveEnd, leaveResult.mother.end));
    const gapDays = Math.max(0, differenceInDays(gapEnd, leaveEnd));
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(total, differenceInDays(activeStart, leaveStart)));
    return {
      motherPercent: Math.max(0, Math.min(100, (motherDays / total) * 100)),
      fatherPercent: Math.max(0, Math.min(100, (fatherDays / total) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / total) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / total) * 100)),
      totalDays: total,
    };
  }, [leaveStart, leaveResult.mother.end, leaveEnd, gapEnd, activeMonth]);

  const monthLabel = format(activeMonth, 'MMM', { locale: nb }).toUpperCase();

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
    // py-4 gir plass til badge under linjen, sikrer ≥44px touch-target (WCAG)
    <div
      role="slider"
      tabIndex={0}
      aria-label="Naviger i permisjonstidslinjen"
      aria-valuetext={format(activeMonth, 'MMMM yyyy', { locale: nb })}
      className="relative py-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded select-none"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Farget linje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
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

      {/* Månedsbadge — plassert under linjen, sentrert på markørpunktet */}
      <div
        className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ left: `${currentPercent}%` }}
      >
        <div className="w-px h-2 bg-foreground/60" />
        <div className="bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight whitespace-nowrap">
          {monthLabel}
        </div>
      </div>
    </div>
  );
}
