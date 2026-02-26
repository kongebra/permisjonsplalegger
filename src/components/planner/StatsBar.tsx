'use client';

import { useMemo } from 'react';
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

    // Bruk hverdager (man-fre) — helger teller ikke som "udekket gap"
    const gapDays = leaveResult.gap.workDays;

    // Check how much of the gap is covered by custom periods
    const gapStart = leaveResult.gap.start;
    const gapEnd = leaveResult.gap.end;

    const gapPeriods = customPeriods.filter(
      (p) =>
        (p.type === 'ferie' || p.type === 'ulonnet' || p.type === 'annet') &&
        p.startDate < gapEnd &&
        p.endDate > gapStart
    );

    // Tell hverdager dekket av perioder i gapet
    const coveredDays = gapPeriods.reduce((sum, p) => {
      const overlapStart = p.startDate > gapStart ? p.startDate : gapStart;
      const overlapEnd = p.endDate < gapEnd ? p.endDate : gapEnd;
      let count = 0;
      const cur = new Date(overlapStart);
      while (cur < overlapEnd) {
        const day = cur.getDay();
        if (day >= 1 && day <= 5) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return sum + count;
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
          ? 'bg-success-bg text-success-fg'
          : 'bg-warning-bg text-warning-fg'
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
