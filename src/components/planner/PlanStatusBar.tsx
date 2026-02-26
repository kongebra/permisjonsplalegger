'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORK_DAYS_PER_WEEK } from '@/lib/constants';
import { GlossaryTerm } from '@/components/ui/glossary-term';
import type { LeaveResult, CustomPeriod } from '@/lib/types';

interface PlanStatusBarProps {
  leaveResult: LeaveResult;
  customPeriods: CustomPeriod[];
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

export function PlanStatusBar({
  leaveResult,
  customPeriods,
  daycareEnabled,
  daycareDate,
}: PlanStatusBarProps) {
  const gapInfo = useMemo(() => {
    if (!daycareEnabled || !daycareDate) return null;

    const gapDays = leaveResult.gap.workDays;
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
    const remainingWeeks = Math.floor(remainingDays / WORK_DAYS_PER_WEEK);
    const extraDays = remainingDays % WORK_DAYS_PER_WEEK;

    return {
      totalDays: gapDays,
      coveredDays,
      remainingDays,
      remainingWeeks,
      extraDays,
      isCovered: remainingDays === 0,
    };
  }, [daycareEnabled, daycareDate, leaveResult.gap, customPeriods]);

  // Ikke vis noe hvis barnehage ikke er aktivert
  if (!daycareEnabled || !daycareDate) return null;

  return (
    <div className="space-y-1.5">
      {/* Gap-status — vises kun hvis det faktisk finnes et gap (workDays > 0) */}
      {gapInfo && gapInfo.totalDays > 0 && (
        <div
          role="status"
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
              <span>
                <GlossaryTerm term="gap">Gap</GlossaryTerm> dekket med ferie/permisjon
              </span>
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
      )}

      {/* Kompakt sammendragsrad */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        <span className="font-medium text-mother">
          Mor {leaveResult.mother.weeks}uk
        </span>
        <span>│</span>
        <span className="font-medium text-father">
          Far {leaveResult.father.weeks}uk
        </span>
        <span>│</span>
        <span>Bhg {format(daycareDate, 'd. MMM', { locale: nb })}</span>
      </div>
    </div>
  );
}
