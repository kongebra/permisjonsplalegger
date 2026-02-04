'use client';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage, ParentRights, LeaveResult, CustomPeriod } from '@/lib/types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface StatsBarProps {
  coverage: Coverage;
  rights: ParentRights;
  leaveResult: LeaveResult;
  customPeriods: CustomPeriod[];
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

interface QuotaInfo {
  label: string;
  used: number;
  total: number;
  color: string;
}

export function StatsBar({
  coverage,
  rights,
  leaveResult,
  customPeriods,
  daycareEnabled,
  daycareDate,
}: StatsBarProps) {
  const config = LEAVE_CONFIG[coverage];

  // Calculate quota usage
  const quotas = useMemo((): QuotaInfo[] => {
    const result: QuotaInfo[] = [];

    // Mother's quota
    if (rights !== 'father-only') {
      const motherPeriods = customPeriods.filter(
        (p) => p.parent === 'mother' && p.type === 'permisjon'
      );
      const motherWeeksUsed = motherPeriods.reduce((sum, p) => {
        return sum + Math.ceil(differenceInDays(p.endDate, p.startDate) / 7);
      }, 0);

      result.push({
        label: 'Mors kvote',
        used: Math.min(motherWeeksUsed, config.mother),
        total: config.mother,
        color: 'bg-pink-400',
      });
    }

    // Father's quota
    if (rights !== 'mother-only') {
      const fatherPeriods = customPeriods.filter(
        (p) => p.parent === 'father' && p.type === 'permisjon'
      );
      const fatherWeeksUsed = fatherPeriods.reduce((sum, p) => {
        return sum + Math.ceil(differenceInDays(p.endDate, p.startDate) / 7);
      }, 0);

      result.push({
        label: 'Fars kvote',
        used: Math.min(fatherWeeksUsed, config.father),
        total: config.father,
        color: 'bg-blue-400',
      });
    }

    // Shared quota (only if both parents)
    if (rights === 'both') {
      const allPermisjonPeriods = customPeriods.filter((p) => p.type === 'permisjon');
      const totalWeeksUsed = allPermisjonPeriods.reduce((sum, p) => {
        return sum + Math.ceil(differenceInDays(p.endDate, p.startDate) / 7);
      }, 0);

      // Shared weeks = total used - individual quotas
      const sharedUsed = Math.max(0, totalWeeksUsed - config.mother - config.father);

      result.push({
        label: 'Fellesperiode',
        used: Math.min(sharedUsed, config.shared),
        total: config.shared,
        color: 'bg-purple-400',
      });
    }

    return result;
  }, [coverage, rights, customPeriods, config]);

  // Calculate gap info
  const gapInfo = useMemo(() => {
    if (!daycareEnabled || !daycareDate) {
      return null;
    }

    const gapWeeks = leaveResult.gap.weeks;
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

    return {
      totalWeeks: gapWeeks,
      totalDays: gapDays,
      coveredDays,
      remainingDays,
      isCovered: remainingDays === 0,
    };
  }, [daycareEnabled, daycareDate, leaveResult.gap, customPeriods]);

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
      {/* Quota bars */}
      <div className="space-y-2">
        {quotas.map((quota) => (
          <div key={quota.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{quota.label}</span>
              <span className="font-medium">
                {quota.used}/{quota.total} uker
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', quota.color)}
                style={{ width: `${Math.min(100, (quota.used / quota.total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Gap indicator */}
      {gapInfo && gapInfo.totalDays > 0 && (
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
              <span>Gap dekket med ferie/permisjon</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {gapInfo.remainingDays} dager udekket gap
                {gapInfo.coveredDays > 0 && ` (${gapInfo.coveredDays} dekket)`}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
