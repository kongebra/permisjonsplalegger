'use client';

import { useMemo } from 'react';
import { format, isSameDay, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { X, Baby, GraduationCap, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CustomPeriod, LeaveResult } from '@/lib/types';
import { getHolidayMap } from '@/lib/holidays';

interface DayDetailPanelProps {
  date: Date;
  customPeriods: CustomPeriod[];
  leaveResult: LeaveResult;
  dueDate: Date;
  daycareStart: Date | null;
  onEditPeriod: (periodId: string) => void;
  onClose: () => void;
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  permisjon: 'Permisjon',
  ferie: 'Ferie',
  ulonnet: 'Ulønnet permisjon',
  annet: 'Annet',
};

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  preBirth: 'Før fødsel',
  mandatory: 'Obligatorisk',
  quota: 'Kvote',
  shared: 'Fellesperiode',
  overlap: 'Overlapp',
  vacation: 'Ferie',
  unpaid: 'Ulønnet',
};

export function DayDetailPanel({
  date,
  customPeriods,
  leaveResult,
  dueDate,
  daycareStart,
  onEditPeriod,
  onClose,
}: DayDetailPanelProps) {
  const isDueDate = isSameDay(date, dueDate);
  const isDaycareStart = daycareStart ? isSameDay(date, daycareStart) : false;

  // Check if date is in the gap
  const isGapDay = useMemo(() => {
    if (leaveResult.gap.days <= 0) return false;
    return (
      date >= leaveResult.gap.start &&
      date < leaveResult.gap.end
    );
  }, [date, leaveResult.gap]);

  // Holiday check
  const holidayName = useMemo(() => {
    const map = getHolidayMap(date, date);
    return map.get(date.toISOString().split('T')[0]);
  }, [date]);

  // Find overlapping periods (endDate is exclusive)
  const overlappingPeriods = useMemo(() => {
    return customPeriods.filter(
      (p) => date >= p.startDate && date < p.endDate
    );
  }, [date, customPeriods]);

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 bg-background rounded-t-2xl shadow-2xl border-t z-40',
        'p-4 pb-6 max-h-[50vh] overflow-y-auto',
        'transform transition-transform duration-200 translate-y-0',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold capitalize">
          {format(date, 'EEEE d. MMMM yyyy', { locale: nb })}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mr-2" aria-label="Lukk">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {holidayName && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {holidayName}
          </span>
        )}
        {isDueDate && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Baby className="w-3 h-3" />
            Termindato
          </span>
        )}
        {isDaycareStart && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <GraduationCap className="w-3 h-3" />
            Barnehagestart
          </span>
        )}
        {isGapDay && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            Gap-dag
          </span>
        )}
      </div>

      {/* Overlapping periods */}
      {overlappingPeriods.length > 0 ? (
        <div className="space-y-2">
          {overlappingPeriods.map((period) => (
            <div
              key={period.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50"
            >
              {/* Parent color dot */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full shrink-0',
                  period.parent === 'mother' ? 'bg-pink-400' : 'bg-blue-400'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {period.label || PERIOD_TYPE_LABELS[period.type] || period.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period.parent === 'mother' ? 'Mor' : 'Far'}
                  {period.segmentType && ` — ${SEGMENT_TYPE_LABELS[period.segmentType] || period.segmentType}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(period.startDate, 'd. MMM', { locale: nb })} – {format(subDays(period.endDate, 1), 'd. MMM yyyy', { locale: nb })}
                </p>
              </div>
              {!period.isLocked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => onEditPeriod(period.id)}
                  aria-label="Rediger periode"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ingen perioder denne dagen.
        </p>
      )}
    </div>
  );
}
