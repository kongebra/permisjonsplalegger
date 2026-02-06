'use client';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { LeaveResult, CustomPeriod } from '@/lib/types';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { GlossaryTerm } from '@/components/ui/glossary-term';
interface StatsBarProps {
  leaveResult: LeaveResult;
  customPeriods: CustomPeriod[];
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

export function StatsBar({
  leaveResult,
  customPeriods,
  daycareEnabled,
  daycareDate,
}: StatsBarProps) {
  // Calculate gap info
  const gapInfo = useMemo(() => {
    if (!daycareEnabled || !daycareDate) {
      return null;
    }

    const gapDays = leaveResult.gap.days;

    // Check how much of the gap is covered by custom periods
    const gapStart = leaveResult.gap.start;
    const gapEnd = leaveResult.gap.end;

    const gapPeriods = customPeriods.filter(
      (p) =>
        (p.type === 'ferie' || p.type === 'ulonnet' || p.type === 'annet') &&
        p.startDate < gapEnd &&
        p.endDate > gapStart
    );

    const coveredDays = gapPeriods.reduce((sum, p) => {
      const overlapStart = p.startDate > gapStart ? p.startDate : gapStart;
      const overlapEnd = p.endDate < gapEnd ? p.endDate : gapEnd;
      return sum + Math.max(0, differenceInDays(overlapEnd, overlapStart));
    }, 0);

    const remainingDays = Math.max(0, gapDays - coveredDays);
    const remainingWeeks = Math.floor(remainingDays / 7);
    const extraDays = remainingDays % 7;

    return {
      totalDays: gapDays,
      coveredDays,
      remainingDays,
      remainingWeeks,
      extraDays,
      isCovered: remainingDays === 0,
    };
  }, [daycareEnabled, daycareDate, leaveResult.gap, customPeriods]);

  if (!gapInfo || gapInfo.totalDays <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg text-sm',
        gapInfo.isCovered
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
      )}
    >
      {gapInfo.isCovered ? (
        <>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span><GlossaryTerm term="gap">Gap</GlossaryTerm> dekket med ferie/permisjon</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {gapInfo.remainingWeeks > 0
              ? `${gapInfo.remainingWeeks} uker${gapInfo.extraDays > 0 ? ` ${gapInfo.extraDays} dager` : ''}`
              : `${gapInfo.remainingDays} dager`}
            {' '}udekket <GlossaryTerm term="gap">gap</GlossaryTerm>
            {gapInfo.coveredDays > 0 && ` (${gapInfo.coveredDays} dager dekket)`}
          </span>
        </>
      )}
    </div>
  );
}
