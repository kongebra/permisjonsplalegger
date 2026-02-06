/**
 * UI slice - manages transient UI state for the planner
 */

import type { StateCreator } from 'zustand';
import type { Parent, PlannerPeriodType } from '@/lib/types';

export interface UiSlice {
  // Period selection state
  selectedPeriodType: PlannerPeriodType;
  selectedParent: Parent;
  selectionStartDate: Date | null;
  selectionEndDate: Date | null;
  isSelecting: boolean;

  // Drag selection state
  isDragging: boolean;
  dragStartDate: Date | null;
  dragCurrentDate: Date | null;

  // Calendar navigation
  activeMonth: Date;
  showMonthOverview: boolean;
  showYearOverview: boolean;

  // Modal state
  editingPeriodId: string | null;
  showPeriodModal: boolean;

  // Actions
  setSelectedPeriodType: (type: PlannerPeriodType) => void;
  setSelectedParent: (parent: Parent) => void;
  startSelection: (date: Date) => void;
  setSelectionEnd: (date: Date) => void;
  clearSelection: () => void;

  // Drag actions
  startDrag: (date: Date) => void;
  updateDrag: (date: Date) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  setActiveMonth: (month: Date) => void;
  navigateMonth: (delta: number) => void;
  setShowMonthOverview: (show: boolean) => void;
  setShowYearOverview: (show: boolean) => void;

  openPeriodModal: (periodId?: string) => void;
  closePeriodModal: () => void;

  resetUi: () => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => ({
  // Initial state
  selectedPeriodType: 'permisjon',
  selectedParent: 'mother',
  selectionStartDate: null,
  selectionEndDate: null,
  isSelecting: false,

  // Drag state
  isDragging: false,
  dragStartDate: null,
  dragCurrentDate: null,

  activeMonth: new Date(),
  showMonthOverview: false,
  showYearOverview: false,

  editingPeriodId: null,
  showPeriodModal: false,

  // Period selection actions
  setSelectedPeriodType: (type) => set({ selectedPeriodType: type }),

  setSelectedParent: (parent) => set({ selectedParent: parent }),

  startSelection: (date) =>
    set({
      selectionStartDate: date,
      selectionEndDate: null,
      isSelecting: true,
    }),

  setSelectionEnd: (date) => set({ selectionEndDate: date }),

  clearSelection: () =>
    set({
      selectionStartDate: null,
      selectionEndDate: null,
      isSelecting: false,
    }),

  // Calendar navigation actions
  setActiveMonth: (month) => set({ activeMonth: month }),

  navigateMonth: (delta) => {
    const { activeMonth } = get();
    const newMonth = new Date(activeMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    set({ activeMonth: newMonth });
  },

  setShowMonthOverview: (show) => set({ showMonthOverview: show }),

  setShowYearOverview: (show) => set({ showYearOverview: show }),

  // Drag actions
  startDrag: (date) =>
    set({
      isDragging: true,
      dragStartDate: date,
      dragCurrentDate: date,
      selectionStartDate: date,
      selectionEndDate: null,
      isSelecting: true,
    }),

  updateDrag: (date) => {
    const { isDragging, dragStartDate } = get();
    if (!isDragging || !dragStartDate) return;
    set({
      dragCurrentDate: date,
      selectionEndDate: date,
    });
  },

  endDrag: () => {
    const { dragStartDate, dragCurrentDate } = get();
    set({
      isDragging: false,
      selectionStartDate: dragStartDate,
      selectionEndDate: dragCurrentDate,
    });
  },

  cancelDrag: () =>
    set({
      isDragging: false,
      dragStartDate: null,
      dragCurrentDate: null,
      selectionStartDate: null,
      selectionEndDate: null,
      isSelecting: false,
    }),

  // Modal actions
  openPeriodModal: (periodId) =>
    set({
      editingPeriodId: periodId ?? null,
      showPeriodModal: true,
    }),

  closePeriodModal: () =>
    set({
      editingPeriodId: null,
      showPeriodModal: false,
    }),

  resetUi: () =>
    set({
      selectedPeriodType: 'permisjon',
      selectedParent: 'mother',
      selectionStartDate: null,
      selectionEndDate: null,
      isSelecting: false,
      isDragging: false,
      dragStartDate: null,
      dragCurrentDate: null,
      activeMonth: new Date(),
      showMonthOverview: false,
      showYearOverview: false,
      editingPeriodId: null,
      showPeriodModal: false,
    }),
});
