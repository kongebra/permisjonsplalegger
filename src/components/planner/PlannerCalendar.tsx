'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { startOfMonth, addDays, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { MonthOverview } from './MonthOverview';
import { useCalculatedLeave, usePeriods, useUi, useWizard } from '@/store/hooks';
import { LEAVE_CONFIG } from '@/lib/constants';

export function PlannerCalendar() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store state
  const { dueDate, coverage, rights } = useWizard();
  const { periods } = usePeriods();
  const {
    activeMonth,
    showMonthOverview,
    selectionStartDate,
    selectionEndDate,
    isSelecting,
    setActiveMonth,
    navigateMonth,
    setShowMonthOverview,
    startSelection,
    setSelectionEnd,
    clearSelection,
  } = useUi();

  // Calculated leave result
  const leaveResult = useCalculatedLeave();

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

  // Handle day click for tap-tap selection
  const handleDayClick = useCallback(
    (date: Date) => {
      if (!isSelecting) {
        // First tap - start selection
        startSelection(date);
      } else if (selectionStartDate) {
        // Second tap - complete selection
        setSelectionEnd(date);
        // Selection is complete - will be handled by parent to create period
      }
    },
    [isSelecting, selectionStartDate, startSelection, setSelectionEnd]
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

  // Scroll to active month on mount
  useEffect(() => {
    // Set active month to first month of leave if not set
    if (leaveResult.mother.start && !isSameMonth(activeMonth, leaveResult.mother.start)) {
      setActiveMonth(startOfMonth(leaveResult.mother.start));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate date range for overview
  const dateRange = useMemo(() => {
    return {
      start: leaveResult.mother.start,
      end: leaveResult.gap.end || leaveResult.father.end,
    };
  }, [leaveResult]);

  return (
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
          selectionStart={selectionStartDate}
          selectionEnd={selectionEndDate}
          onDayClick={handleDayClick}
        />
      </div>

      {/* Selection hint */}
      {isSelecting && selectionStartDate && !selectionEndDate && (
        <div className="text-center text-sm text-muted-foreground">
          Trykk på sluttdato for å fullføre
        </div>
      )}

      {/* Clear selection button */}
      {isSelecting && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Avbryt valg
          </Button>
        </div>
      )}

      {/* Month overview modal */}
      {showMonthOverview && (
        <MonthOverview
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
  );
}
