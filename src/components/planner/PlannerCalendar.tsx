'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startOfMonth, addDays, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { YearOverview } from './YearOverview';
import { AddPeriodFab } from './AddPeriodFab';
import { PeriodModal } from './PeriodModal';
import { DayDetailPanel } from './DayDetailPanel';
import { StatsBar } from './StatsBar';
import posthog from 'posthog-js';
import { useCalculatedLeave, usePeriods, useUi, useWizard } from '@/store/hooks';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { CustomPeriod } from '@/lib/types';

export function PlannerCalendar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Store state
  const { dueDate, coverage, rights, daycareStartDate, daycareEnabled } = useWizard();
  const { periods, addPeriod, updatePeriod, deletePeriod, initializeFromLeave } = usePeriods();
  const {
    activeMonth,
    showMonthOverview,
    selectedDate,
    showDayDetail,
    editingPeriodId,
    showPeriodModal,
    setActiveMonth,
    navigateMonth,
    setShowMonthOverview,
    selectDate,
    clearSelectedDate,
    openPeriodModal,
    closePeriodModal,
  } = useUi();

  // Month slide direction tracking — set from event handlers, not effects
  const [monthDirection, setMonthDirection] = useState<'forward' | 'backward' | null>(null);

  const navigateMonthWithDirection = useCallback(
    (delta: number) => {
      setMonthDirection(delta > 0 ? 'forward' : 'backward');
      navigateMonth(delta);
    },
    [navigateMonth],
  );

  const setActiveMonthWithDirection = useCallback(
    (month: Date) => {
      setMonthDirection(month > activeMonth ? 'forward' : 'backward');
      setActiveMonth(month);
    },
    [activeMonth, setActiveMonth],
  );

  // Calculated leave result
  const leaveResult = useCalculatedLeave();

  // Get editing period
  const editingPeriod = useMemo(() => {
    if (!editingPeriodId) return null;
    return periods.find((p) => p.id === editingPeriodId) || null;
  }, [editingPeriodId, periods]);

  // Calculate locked dates (mandatory periods)
  const lockedDates = useMemo(() => {
    const locked: { start: Date; end: Date }[] = [];
    const config = LEAVE_CONFIG[coverage];

    if (rights !== 'father-only') {
      const preBirthStart = addDays(dueDate, -config.preBirth * 7);
      locked.push({ start: preBirthStart, end: dueDate });

      const mandatoryEnd = addDays(dueDate, config.motherMandatoryPostBirth * 7);
      locked.push({ start: dueDate, end: mandatoryEnd });
    }

    return locked;
  }, [dueDate, coverage, rights]);

  // Handle day click — open detail panel
  const handleDateSelect = useCallback(
    (date: Date) => {
      selectDate(date);
    },
    [selectDate],
  );

  // Handle editing a period from the day detail panel
  const handleEditFromDetail = useCallback(
    (periodId: string) => {
      clearSelectedDate();
      openPeriodModal(periodId);
    },
    [clearSelectedDate, openPeriodModal],
  );

  // Handle period band click — open modal for editing
  const handlePeriodSelect = useCallback(
    (periodId: string) => {
      const period = periods.find((p) => p.id === periodId);
      if (period?.isLocked) return;
      openPeriodModal(periodId);
    },
    [periods, openPeriodModal],
  );

  // Handle period save from modal
  const handlePeriodSave = useCallback(
    (periodData: Omit<CustomPeriod, 'id'>) => {
      addPeriod(periodData);
      setSrAnnouncement('Periode lagt til');
    },
    [addPeriod],
  );

  // Handle period update from modal
  const handlePeriodUpdate = useCallback(
    (id: string, updates: Partial<CustomPeriod>) => {
      updatePeriod(id, updates);
      setSrAnnouncement('Periode oppdatert');
    },
    [updatePeriod],
  );

  // Handle period delete from modal
  const handlePeriodDelete = useCallback(
    (id: string) => {
      deletePeriod(id);
      setSrAnnouncement('Periode slettet');
    },
    [deletePeriod],
  );

  // Swipe handling for mobile navigation
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          navigateMonthWithDirection(1);
        } else {
          navigateMonthWithDirection(-1);
        }
      }

      touchStartX.current = null;
    },
    [navigateMonthWithDirection],
  );

  // Initialize periods on first render (safe: updates own component's store slice)
  const hasInitialized = useRef<boolean | null>(null);
  if (hasInitialized.current == null) {
    hasInitialized.current = true;
    initializeFromLeave(leaveResult);
  }

  // Set active month after mount to avoid setState-during-render warning
  useEffect(() => {
    if (leaveResult.mother.start && !isSameMonth(activeMonth, leaveResult.mother.start)) {
      setActiveMonth(startOfMonth(leaveResult.mother.start));
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate date range for overview
  const dateRange = useMemo(() => {
    return {
      start: leaveResult.mother.start,
      end: leaveResult.gap.end || leaveResult.father.end,
    };
  }, [leaveResult]);

  return (
    <div>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {srAnnouncement}
      </div>
      <div className="space-y-4">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonthWithDirection(-1)}
            aria-label="Forrige måned"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              posthog.capture('year_overview_opened');
              setShowMonthOverview(true);
            }}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Oversikt</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonthWithDirection(1)}
            aria-label="Neste måned"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Color legend */}
        <ul className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-xs text-muted-foreground list-none">
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-mother-base" role="img" aria-label="Mor farge" />
            <span>Mor</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-father-base" role="img" aria-label="Far farge" />
            <span>Far</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-gap-border bg-gap" role="img" aria-label="Gap farge" />
            <span>Gap</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-unpaid opacity-60" role="img" aria-label="Ulønnet farge" />
            <span>Ulønnet</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-duedate" role="img" aria-label="Termin markør" />
            <span>Termin</span>
          </li>
          {daycareEnabled && (
            <li className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-daycare" role="img" aria-label="Barnehagestart markør" />
              <span>Barnehagestart</span>
            </li>
          )}
        </ul>

        {/* Calendar */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="touch-pan-y overflow-hidden"
        >
          <div
            key={activeMonth.toISOString()}
            className={
              monthDirection === 'forward'
                ? 'animate-month-slide-right'
                : monthDirection === 'backward'
                  ? 'animate-month-slide-left'
                  : undefined
            }
          >
            <MonthView
              month={activeMonth}
              dueDate={dueDate}
              daycareStart={daycareEnabled ? daycareStartDate ?? undefined : undefined}
              segments={leaveResult.segments}
              customPeriods={periods}
              lockedDates={lockedDates}
              onPeriodSelect={handlePeriodSelect}
              onDateSelect={handleDateSelect}
            />
          </div>
        </div>

        {/* Gap indicator */}
        <StatsBar
          leaveResult={leaveResult}
          customPeriods={periods}
          daycareEnabled={daycareEnabled}
          daycareDate={daycareStartDate}
        />

        {/* Aktivitetskrav-informasjon: kun synlig ved far-only */}
        {rights === 'father-only' && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Om aktivitetskravet</p>
            <p className="text-muted-foreground">
              10 av ukene dine kan tas ut fritt. For de resterende ukene
              må mor enten jobbe, studere på heltid eller oppfylle
              annet godkjent aktivitetskrav fra NAV.
            </p>
            <p className="text-muted-foreground text-xs">
              Kalkulatoren tar ikke hensyn til reduksjon ved mors deltidsarbeid.
            </p>
          </div>
        )}

        {/* Year overview modal */}
        {showMonthOverview && (
          <YearOverview
            startDate={dateRange.start}
            endDate={dateRange.end}
            dueDate={dueDate}
            daycareStart={daycareEnabled ? daycareStartDate ?? undefined : undefined}
            activeMonth={activeMonth}
            segments={leaveResult.segments}
            customPeriods={periods}
            onMonthSelect={setActiveMonthWithDirection}
            onClose={() => setShowMonthOverview(false)}
          />
        )}
      </div>

      {/* Day detail panel */}
      {showDayDetail && selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          customPeriods={periods}
          leaveResult={leaveResult}
          dueDate={dueDate}
          daycareStart={daycareEnabled ? daycareStartDate : null}
          onEditPeriod={handleEditFromDetail}
          onClose={clearSelectedDate}
        />
      )}

      {/* FAB for adding new periods — hidden during overlays */}
      {!showDayDetail && !showMonthOverview && <AddPeriodFab onClick={() => openPeriodModal()} />}

      {/* Period edit modal */}
      <PeriodModal
        open={showPeriodModal}
        period={editingPeriod}
        rights={rights}
        leaveResult={leaveResult}
        customPeriods={periods}
        dueDate={dueDate}
        daycareStart={daycareEnabled ? daycareStartDate : null}
        onClose={closePeriodModal}
        onSave={handlePeriodSave}
        onUpdate={handlePeriodUpdate}
        onDelete={handlePeriodDelete}
      />
    </div>
  );
}
