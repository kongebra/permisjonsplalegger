/**
 * Periods slice - manages custom periods added by the user
 */

import type { StateCreator } from 'zustand';
import type { CustomPeriod, Parent, PlannerPeriodType, UndoAction } from '@/lib/types';

export interface PeriodsSlice {
  periods: CustomPeriod[];
  undoStack: UndoAction[];

  // Actions
  addPeriod: (period: Omit<CustomPeriod, 'id'>) => string;
  updatePeriod: (id: string, updates: Partial<CustomPeriod>) => void;
  deletePeriod: (id: string) => void;
  undo: () => void;
  clearPeriods: () => void;
  setPeriods: (periods: CustomPeriod[]) => void;

  // Helpers
  getPeriodsByParent: (parent: Parent) => CustomPeriod[];
  getPeriodsByType: (type: PlannerPeriodType) => CustomPeriod[];
  getPeriodsInRange: (start: Date, end: Date) => CustomPeriod[];
}

function generateId(): string {
  return `period-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const MAX_UNDO_STACK = 20;

export const createPeriodsSlice: StateCreator<PeriodsSlice, [], [], PeriodsSlice> = (
  set,
  get
) => ({
  periods: [],
  undoStack: [],

  addPeriod: (periodData) => {
    const id = generateId();
    const period: CustomPeriod = { ...periodData, id };

    set((state) => ({
      periods: [...state.periods, period],
      undoStack: [
        { type: 'add', period },
        ...state.undoStack.slice(0, MAX_UNDO_STACK - 1),
      ],
    }));

    return id;
  },

  updatePeriod: (id, updates) => {
    const { periods } = get();
    const existingPeriod = periods.find((p) => p.id === id);

    if (!existingPeriod) return;

    const updatedPeriod = { ...existingPeriod, ...updates };

    set((state) => ({
      periods: state.periods.map((p) => (p.id === id ? updatedPeriod : p)),
      undoStack: [
        { type: 'update', period: updatedPeriod, previousPeriod: existingPeriod },
        ...state.undoStack.slice(0, MAX_UNDO_STACK - 1),
      ],
    }));
  },

  deletePeriod: (id) => {
    const { periods } = get();
    const period = periods.find((p) => p.id === id);

    if (!period) return;

    set((state) => ({
      periods: state.periods.filter((p) => p.id !== id),
      undoStack: [
        { type: 'delete', period },
        ...state.undoStack.slice(0, MAX_UNDO_STACK - 1),
      ],
    }));
  },

  undo: () => {
    const { undoStack, periods } = get();
    const lastAction = undoStack[0];

    if (!lastAction) return;

    let newPeriods = periods;

    switch (lastAction.type) {
      case 'add':
        // Undo add = remove the period
        newPeriods = periods.filter((p) => p.id !== lastAction.period.id);
        break;
      case 'delete':
        // Undo delete = restore the period
        newPeriods = [...periods, lastAction.period];
        break;
      case 'update':
        // Undo update = restore previous version
        if (lastAction.previousPeriod) {
          newPeriods = periods.map((p) =>
            p.id === lastAction.period.id ? lastAction.previousPeriod! : p
          );
        }
        break;
    }

    set({
      periods: newPeriods,
      undoStack: undoStack.slice(1),
    });
  },

  clearPeriods: () => set({ periods: [], undoStack: [] }),

  setPeriods: (periods) => set({ periods, undoStack: [] }),

  // Helper methods (these are computed, not stored)
  getPeriodsByParent: (parent) => {
    return get().periods.filter((p) => p.parent === parent);
  },

  getPeriodsByType: (type) => {
    return get().periods.filter((p) => p.type === type);
  },

  getPeriodsInRange: (start, end) => {
    return get().periods.filter(
      (p) => p.startDate < end && p.endDate > start
    );
  },
});
