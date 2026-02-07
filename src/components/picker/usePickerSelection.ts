'use client';

import { useState, useCallback } from 'react';
import { addDays } from 'date-fns';

type SelectionPhase = 'idle' | 'start-selected' | 'range-selected';

interface PickerSelectionState {
  startDate: Date | null;
  endDate: Date | null; // exclusive
  phase: SelectionPhase;
}

interface UsePickerSelectionReturn {
  startDate: Date | null;
  endDate: Date | null; // exclusive
  phase: SelectionPhase;
  handleDayTap: (date: Date) => void;
  reset: () => void;
}

/**
 * Momondo-style tap-tap-reset selection state machine.
 *
 * idle ──[tap]──> start-selected  (start = tapped, end = null)
 * start-selected ──[tap]──> range-selected  (end = tapped + 1; swap if before start)
 * range-selected ──[tap]──> start-selected  (RESET: start = new tap, end = null)
 */
export function usePickerSelection(
  initialStart: Date | null,
  initialEnd: Date | null,
  onSelectionChange: (start: Date | null, end: Date | null) => void,
): UsePickerSelectionReturn {
  const [state, setState] = useState<PickerSelectionState>(() => {
    if (initialStart && initialEnd) {
      return { startDate: initialStart, endDate: initialEnd, phase: 'range-selected' };
    }
    if (initialStart) {
      return { startDate: initialStart, endDate: null, phase: 'start-selected' };
    }
    return { startDate: null, endDate: null, phase: 'idle' };
  });

  const handleDayTap = useCallback(
    (date: Date) => {
      setState((prev) => {
        switch (prev.phase) {
          case 'idle': {
            const next = { startDate: date, endDate: null, phase: 'start-selected' as const };
            onSelectionChange(next.startDate, next.endDate);
            return next;
          }
          case 'start-selected': {
            // If tapped same day, create 1-day range
            let start = prev.startDate!;
            let end = addDays(date, 1); // exclusive

            // Swap if tapped before start
            if (date < start) {
              end = addDays(start, 1);
              start = date;
            }

            const next = { startDate: start, endDate: end, phase: 'range-selected' as const };
            onSelectionChange(next.startDate, next.endDate);
            return next;
          }
          case 'range-selected': {
            // Reset: start new selection
            const next = { startDate: date, endDate: null, phase: 'start-selected' as const };
            onSelectionChange(next.startDate, next.endDate);
            return next;
          }
        }
      });
    },
    [onSelectionChange],
  );

  const reset = useCallback(() => {
    setState({ startDate: null, endDate: null, phase: 'idle' });
    onSelectionChange(null, null);
  }, [onSelectionChange]);

  return {
    startDate: state.startDate,
    endDate: state.endDate,
    phase: state.phase,
    handleDayTap,
    reset,
  };
}
