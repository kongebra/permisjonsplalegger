'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { startOfMonth, addDays, isSameMonth, endOfMonth, isBefore, isAfter, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { YearOverview } from './YearOverview';
import { PeriodToolbar } from './PeriodToolbar';
import { PeriodModal } from './PeriodModal';
import { StatsBar } from './StatsBar';
import { useCalculatedLeave, usePeriods, useUi, useWizard } from '@/store/hooks';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { CustomPeriod } from '@/lib/types';

export function PlannerCalendar() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store state
  const { dueDate, coverage, rights, daycareStartDate, daycareEnabled } = useWizard();
  const { periods, addPeriod, updatePeriod, deletePeriod } = usePeriods();
  const {
    activeMonth,
    showMonthOverview,
    selectionStartDate,
    selectionEndDate,
    isDragging,
    selectedPeriodType,
    selectedParent,
    editingPeriodId,
    showPeriodModal,
    setActiveMonth,
    navigateMonth,
    setShowMonthOverview,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    clearSelection,
    setSelectedPeriodType,
    setSelectedParent,
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
      // 3 weeks before due date
      const preBirthStart = addDays(dueDate, -config.preBirth * 7);
      locked.push({ start: preBirthStart, end: dueDate });

      // 6 weeks after birth (mandatory for mother)
      const mandatoryEnd = addDays(dueDate, config.motherMandatoryPostBirth * 7);
      locked.push({ start: dueDate, end: mandatoryEnd });
    }

    return locked;
  }, [dueDate, coverage, rights]);

  // Handle pointer down - start drag selection
  const handlePointerDown = useCallback(
    (date: Date) => {
      startDrag(date);
    },
    [startDrag]
  );

  // Track last auto-navigate time to throttle
  const lastAutoNavigate = useRef<number>(0);

  // Handle pointer enter during drag - update selection and auto-navigate if needed
  const handlePointerEnter = useCallback(
    (date: Date) => {
      if (!isDragging) return;

      updateDrag(date);

      // Auto-navigate if dragging to a date outside current month
      const now = Date.now();
      if (now - lastAutoNavigate.current < 300) return; // Throttle to 300ms

      const monthStart = startOfMonth(activeMonth);
      const monthEnd = endOfMonth(activeMonth);

      if (isBefore(date, monthStart)) {
        // Date is in previous month
        lastAutoNavigate.current = now;
        setActiveMonth(subMonths(activeMonth, 1));
      } else if (isAfter(date, monthEnd)) {
        // Date is in next month
        lastAutoNavigate.current = now;
        setActiveMonth(addMonths(activeMonth, 1));
      }
    },
    [isDragging, updateDrag, activeMonth, setActiveMonth]
  );

  // Handle pointer up - end drag and create period
  const handlePointerUp = useCallback(() => {
    if (isDragging && selectionStartDate) {
      endDrag();

      // Create the period with selected type and parent
      const endDate = selectionEndDate || selectionStartDate;
      const start = selectionStartDate < endDate ? selectionStartDate : endDate;
      const end = selectionStartDate < endDate ? addDays(endDate, 1) : addDays(selectionStartDate, 1);

      addPeriod({
        type: selectedPeriodType,
        parent: selectedParent,
        startDate: start,
        endDate: end,
      });

      // Clear selection immediately (no timeout - fixes double-click bug)
      clearSelection();
    }
  }, [
    isDragging,
    selectionStartDate,
    selectionEndDate,
    selectedPeriodType,
    selectedParent,
    endDrag,
    addPeriod,
    clearSelection,
  ]);

  // Handle day click (fallback for non-drag clicks)
  const handleDayClick = useCallback(
    () => {
      // Click is handled by pointer events now
      // This is kept for accessibility
    },
    []
  );

  // Handle period save from modal
  const handlePeriodSave = useCallback(
    (periodData: Omit<CustomPeriod, 'id'>) => {
      addPeriod(periodData);
    },
    [addPeriod]
  );

  // Handle period update from modal
  const handlePeriodUpdate = useCallback(
    (id: string, updates: Partial<CustomPeriod>) => {
      updatePeriod(id, updates);
    },
    [updatePeriod]
  );

  // Handle period delete from modal
  const handlePeriodDelete = useCallback(
    (id: string) => {
      deletePeriod(id);
    },
    [deletePeriod]
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
          // Swipe left - go to next month
          navigateMonth(1);
        } else {
          // Swipe right - go to previous month
          navigateMonth(-1);
        }
      }

      touchStartX.current = null;
    },
    [navigateMonth]
  );

  // Set active month to first month of leave on mount
  useEffect(() => {
    if (leaveResult.mother.start && !isSameMonth(activeMonth, leaveResult.mother.start)) {
      setActiveMonth(startOfMonth(leaveResult.mother.start));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global pointer up handler for drag selection
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handlePointerUp();
      }
    };

    // Also handle pointer cancel (e.g., scrolling on touch devices)
    const handleGlobalPointerCancel = () => {
      if (isDragging) {
        cancelDrag();
      }
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerCancel);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [isDragging, handlePointerUp, cancelDrag]);

  // Calculate date range for overview
  const dateRange = useMemo(() => {
    return {
      start: leaveResult.mother.start,
      end: leaveResult.gap.end || leaveResult.father.end,
    };
  }, [leaveResult]);

  return (
    <div className="pb-36"> {/* Bottom padding for toolbar */}
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
          className={isDragging ? 'touch-none' : 'touch-pan-y'}
        >
          <MonthView
            month={activeMonth}
            dueDate={dueDate}
            segments={leaveResult.segments}
            customPeriods={periods}
            lockedDates={lockedDates}
            selectionStart={selectionStartDate}
            selectionEnd={selectionEndDate}
            isDragging={isDragging}
            onDayClick={handleDayClick}
            onDayPointerDown={handlePointerDown}
            onDayPointerEnter={handlePointerEnter}
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

        {/* Drag hint */}
        {isDragging && (
          <div className="text-center text-sm text-muted-foreground">
            Dra for å velge periode, slipp for å bekrefte
          </div>
        )}

        {/* Cancel drag button */}
        {isDragging && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={cancelDrag}>
              Avbryt valg
            </Button>
          </div>
        )}

        {/* Year overview modal */}
        {showMonthOverview && (
          <YearOverview
            startDate={dateRange.start}
            endDate={dateRange.end}
            activeMonth={activeMonth}
            segments={leaveResult.segments}
            customPeriods={periods}
            onMonthSelect={setActiveMonth}
            onClose={() => setShowMonthOverview(false)}
          />
        )}
      </div>

      {/* Period toolbar (fixed at bottom) */}
      <PeriodToolbar
        selectedType={selectedPeriodType}
        selectedParent={selectedParent}
        rights={rights}
        onTypeChange={setSelectedPeriodType}
        onParentChange={setSelectedParent}
      />

      {/* Period edit modal */}
      <PeriodModal
        open={showPeriodModal}
        period={editingPeriod}
        rights={rights}
        onClose={closePeriodModal}
        onSave={handlePeriodSave}
        onUpdate={handlePeriodUpdate}
        onDelete={handlePeriodDelete}
      />
    </div>
  );
}
