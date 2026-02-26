'use client';

import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LeaveResult } from '@/lib/types';

interface LeaveHorizonBannerProps {
  leaveResult: LeaveResult;
  activeMonth: Date;
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

export function LeaveHorizonBanner({
  leaveResult,
  activeMonth,
  daycareEnabled,
  daycareDate,
}: LeaveHorizonBannerProps) {
  const leaveStart = leaveResult.mother.start;
  const leaveEnd = leaveResult.father.end;
  const gapEnd = daycareEnabled && daycareDate ? daycareDate : leaveEnd;

  const { motherPercent, fatherPercent, gapPercent, currentPercent } = useMemo(() => {
    const totalDays = Math.max(1, differenceInDays(gapEnd, leaveStart));

    // Mors periode: fra start til mor slutter
    const motherDays = Math.max(0, differenceInDays(leaveResult.mother.end, leaveStart));
    // Fars eksklusive periode: etter mor er ferdig
    const fatherDays = Math.max(0, differenceInDays(leaveEnd, leaveResult.mother.end));
    const gapDays = Math.max(0, differenceInDays(gapEnd, leaveEnd));

    // Markørposisjon: start av aktiv måned
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(totalDays, differenceInDays(activeStart, leaveStart)));

    return {
      motherPercent: Math.max(0, Math.min(100, (motherDays / totalDays) * 100)),
      fatherPercent: Math.max(0, Math.min(100, (fatherDays / totalDays) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / totalDays) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / totalDays) * 100)),
    };
  }, [leaveStart, leaveResult.mother.end, leaveEnd, gapEnd, activeMonth]);

  // Gap-uker igjen (totalt gap fra permisjonsslutt til barnehagestart)
  const gapWeeksLeft = useMemo(() => {
    if (!daycareEnabled || !daycareDate) return null;
    const remainingGapDays = Math.max(0, differenceInDays(daycareDate, leaveEnd));
    return Math.ceil(remainingGapDays / 7);
  }, [daycareEnabled, daycareDate, leaveEnd]);

  // Uker igjen av permisjon fra i dag
  const weeksLeft = useMemo(() => {
    const today = new Date();
    const remaining = Math.max(0, differenceInDays(leaveEnd, today));
    return Math.ceil(remaining / 7);
  }, [leaveEnd]);

  return (
    <div className="space-y-2 pb-2 border-b">
      {/* Tidslinje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
        {/* Mors permisjon */}
        {motherPercent > 0 && (
          <div
            className="h-full bg-mother-base"
            style={{ width: `${motherPercent}%` }}
          />
        )}
        {/* Fars permisjon */}
        {fatherPercent > 0 && (
          <div
            className="h-full bg-father-base"
            style={{ width: `${fatherPercent}%` }}
          />
        )}
        {/* Gapblokk */}
        {gapPercent > 0 && (
          <div
            className="h-full bg-gap border border-dashed border-gap-border"
            style={{ width: `${gapPercent}%` }}
          />
        )}
        {/* "Du er her"-markør */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
          style={{ left: `${currentPercent}%` }}
          title={format(activeMonth, 'MMMM yyyy', { locale: nb })}
        />
      </div>

      {/* Nøkkeltall */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {format(leaveStart, 'd. MMM yyyy', { locale: nb })}
        </span>
        <div className="flex gap-4">
          {weeksLeft > 0 && (
            <span>
              <span className="font-medium text-foreground">{weeksLeft} uker</span> igjen av perm
            </span>
          )}
          {daycareEnabled && daycareDate && gapWeeksLeft !== null && gapWeeksLeft > 0 && (
            <span className={cn('font-medium', 'text-warning-fg')}>
              {gapWeeksLeft} uker gap
            </span>
          )}
          {daycareEnabled && daycareDate && (
            <span>
              Bhg: <span className="font-medium text-foreground">{format(daycareDate, 'd. MMM', { locale: nb })}</span>
            </span>
          )}
        </div>
        <span>
          {format(gapEnd, 'd. MMM yyyy', { locale: nb })}
        </span>
      </div>
    </div>
  );
}
