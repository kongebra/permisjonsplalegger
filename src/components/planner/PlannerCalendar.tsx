'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { startOfMonth, addDays, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { YearOverview } from './YearOverview';
import { AddPeriodFab } from './AddPeriodFab';
import { PeriodModal } from './PeriodModal';
import { DayDetailPanel } from './DayDetailPanel';
import { StatsBar } from './StatsBar';
import { useCalculatedLeave, usePeriods, useUi, useWizard } from '@/store/hooks';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { CustomPeriod } from '@/lib/types';

export function PlannerCalendar() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    },
    [addPeriod],
  );

  // Handle period update from modal
  const handlePeriodUpdate = useCallback(
    (id: string, updates: Partial<CustomPeriod>) => {
      updatePeriod(id, updates);
    },
    [updatePeriod],
  );

  // Handle period delete from modal
  const handlePeriodDelete = useCallback(
    (id: string) => {
      deletePeriod(id);
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
          navigateMonth(1);
        } else {
          navigateMonth(-1);
        }
      }

      touchStartX.current = null;
    },
    [navigateMonth],
  );

  // Set active month to first month of leave on mount + initialize periods
  useEffect(() => {
    if (leaveResult.mother.start && !isSameMonth(activeMonth, leaveResult.mother.start)) {
      setActiveMonth(startOfMonth(leaveResult.mother.start));
    }
    initializeFromLeave(leaveResult);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate date range for overview
  const dateRange = useMemo(() => {
    return {
      start: leaveResult.mother.start,
      end: leaveResult.gap.end || leaveResult.father.end,
    };
  }, [leaveResult]);

  return (
    <div>
      <div className="space-y-4">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth(-1)}
            aria-label="Forrige måned"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMonthOverview(true)}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Oversikt</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth(1)}
            aria-label="Neste måned"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="touch-pan-y"
        >
          <MonthView
            month={activeMonth}
            dueDate={dueDate}
            segments={leaveResult.segments}
            customPeriods={periods}
            lockedDates={lockedDates}
            onPeriodSelect={handlePeriodSelect}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* Stats bar */}
        <StatsBar
          coverage={coverage}
          rights={rights}
          leaveResult={leaveResult}
          customPeriods={periods}
          daycareEnabled={daycareEnabled}
          daycareDate={daycareStartDate}
        />

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
            onMonthSelect={setActiveMonth}
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

      {/* FAB for adding new periods */}
      {!showDayDetail && <AddPeriodFab onClick={() => openPeriodModal()} />}

      {/* Period edit modal */}
      <PeriodModal
        open={showPeriodModal}
        period={editingPeriod}
        rights={rights}
        leaveResult={leaveResult}
        onClose={closePeriodModal}
        onSave={handlePeriodSave}
        onUpdate={handlePeriodUpdate}
        onDelete={handlePeriodDelete}
      />
    </div>
  );
}
