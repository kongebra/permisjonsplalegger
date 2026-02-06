import type { LeaveResult, LeaveSegment, CustomPeriod, PlannerPeriodType } from '@/lib/types';

const SEGMENT_TO_PERIOD_TYPE: Record<string, PlannerPeriodType> = {
  preBirth: 'permisjon',
  mandatory: 'permisjon',
  quota: 'permisjon',
  shared: 'permisjon',
  overlap: 'permisjon',
  vacation: 'ferie',
  unpaid: 'ulonnet',
};

const LOCKED_SEGMENT_TYPES = new Set(['preBirth', 'mandatory']);

let idCounter = 0;

function generateWizardPeriodId(segment: LeaveSegment): string {
  return `wizard-${segment.parent}-${segment.type}-${++idCounter}`;
}

/**
 * Convert wizard LeaveResult segments into editable CustomPeriods.
 *
 * - preBirth and mandatory → locked (not editable)
 * - quota, shared, overlap → editable permisjon
 * - vacation → editable ferie
 * - unpaid → editable ulønnet
 * - gap → NOT converted (shown as warning in StatsBar)
 */
export function initializePeriodsFromLeave(result: LeaveResult): CustomPeriod[] {
  idCounter = 0;
  const periods: CustomPeriod[] = [];

  for (const segment of result.segments) {
    if (segment.type === 'gap') continue;

    const periodType = SEGMENT_TO_PERIOD_TYPE[segment.type];
    if (!periodType) continue;

    periods.push({
      id: generateWizardPeriodId(segment),
      type: periodType,
      parent: segment.parent,
      startDate: segment.start,
      endDate: segment.end,
      isFromWizard: true,
      isLocked: LOCKED_SEGMENT_TYPES.has(segment.type),
      segmentType: segment.type,
    });
  }

  return periods;
}

/**
 * Re-initialize wizard periods while preserving user-added periods.
 * Used when settings change (due date, coverage, etc.) and wizard periods
 * need to be recalculated.
 */
export function reinitializePreservingUserPeriods(
  currentPeriods: CustomPeriod[],
  newLeaveResult: LeaveResult,
): CustomPeriod[] {
  const userPeriods = currentPeriods.filter((p) => !p.isFromWizard);
  const newWizardPeriods = initializePeriodsFromLeave(newLeaveResult);
  return [...newWizardPeriods, ...userPeriods];
}
