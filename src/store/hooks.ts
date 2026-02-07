/**
 * Convenience hooks for accessing store slices
 * Uses useShallow for proper React 19 SSR compatibility
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from './index';
import type { LeaveResult, EconomyResult, TimeSeriesPoint } from '@/lib/types';
import { calculateLeave } from '@/lib/calculator';
import { compareScenarios, generateCumulativeTimeSeries } from '@/lib/calculator/economy';

/**
 * Hook for wizard state and actions
 */
export function useWizard() {
  return usePlannerStore(
    useShallow((state) => ({
      currentStep: state.currentStep,
      wizardCompleted: state.wizardCompleted,
      dueDate: state.dueDate,
      rights: state.rights,
      coverage: state.coverage,
      sharedWeeksToMother: state.sharedWeeksToMother,
      daycareStartDate: state.daycareStartDate,
      daycareEnabled: state.daycareEnabled,
      setCurrentStep: state.setCurrentStep,
      nextStep: state.nextStep,
      prevStep: state.prevStep,
      completeWizard: state.completeWizard,
      resetWizard: state.resetWizard,
      setDueDate: state.setDueDate,
      setRights: state.setRights,
      setCoverage: state.setCoverage,
      setSharedWeeksToMother: state.setSharedWeeksToMother,
      setDaycareStartDate: state.setDaycareStartDate,
      setDaycareEnabled: state.setDaycareEnabled,
    }))
  );
}

/**
 * Hook for job settings
 */
export function useJobSettings() {
  return usePlannerStore(
    useShallow((state) => ({
      motherJobSettings: state.motherJobSettings,
      fatherJobSettings: state.fatherJobSettings,
      setMotherJobSettings: state.setMotherJobSettings,
      setFatherJobSettings: state.setFatherJobSettings,
      setJobSettings: state.setJobSettings,
      resetJobSettings: state.resetJobSettings,
    }))
  );
}

/**
 * Hook for periods management
 */
export function usePeriods() {
  return usePlannerStore(
    useShallow((state) => ({
      periods: state.periods,
      undoStack: state.undoStack,
      addPeriod: state.addPeriod,
      updatePeriod: state.updatePeriod,
      deletePeriod: state.deletePeriod,
      undo: state.undo,
      clearPeriods: state.clearPeriods,
      setPeriods: state.setPeriods,
      getPeriodsByParent: state.getPeriodsByParent,
      getPeriodsByType: state.getPeriodsByType,
      getPeriodsInRange: state.getPeriodsInRange,
      initializeFromLeave: state.initializeFromLeave,
    }))
  );
}

/**
 * Hook for UI state
 */
export function useUi() {
  return usePlannerStore(
    useShallow((state) => ({
      selectedPeriodType: state.selectedPeriodType,
      selectedParent: state.selectedParent,
      selectionStartDate: state.selectionStartDate,
      selectionEndDate: state.selectionEndDate,
      isSelecting: state.isSelecting,
      // Drag state
      isDragging: state.isDragging,
      dragStartDate: state.dragStartDate,
      dragCurrentDate: state.dragCurrentDate,
      activeMonth: state.activeMonth,
      showMonthOverview: state.showMonthOverview,
      showYearOverview: state.showYearOverview,
      selectedDate: state.selectedDate,
      showDayDetail: state.showDayDetail,
      editingPeriodId: state.editingPeriodId,
      showPeriodModal: state.showPeriodModal,
      showSettings: state.showSettings,
      setSelectedPeriodType: state.setSelectedPeriodType,
      setSelectedParent: state.setSelectedParent,
      startSelection: state.startSelection,
      setSelectionEnd: state.setSelectionEnd,
      clearSelection: state.clearSelection,
      // Drag actions
      startDrag: state.startDrag,
      updateDrag: state.updateDrag,
      endDrag: state.endDrag,
      cancelDrag: state.cancelDrag,
      setActiveMonth: state.setActiveMonth,
      navigateMonth: state.navigateMonth,
      setShowMonthOverview: state.setShowMonthOverview,
      setShowYearOverview: state.setShowYearOverview,
      selectDate: state.selectDate,
      clearSelectedDate: state.clearSelectedDate,
      openPeriodModal: state.openPeriodModal,
      closePeriodModal: state.closePeriodModal,
      setShowSettings: state.setShowSettings,
      resetUi: state.resetUi,
    }))
  );
}

/**
 * Hook for economy data
 */
export function useEconomy() {
  return usePlannerStore(
    useShallow((state) => ({
      motherEconomy: state.motherEconomy,
      fatherEconomy: state.fatherEconomy,
      setMotherEconomy: state.setMotherEconomy,
      setFatherEconomy: state.setFatherEconomy,
      setEconomy: state.setEconomy,
      resetEconomy: state.resetEconomy,
    }))
  );
}

/**
 * Hook for persistence
 */
export function usePersistence() {
  return usePlannerStore(
    useShallow((state) => ({
      hasSavedPlan: state.hasSavedPlan,
      autoSaveEnabled: state.autoSaveEnabled,
      lastSavedAt: state.lastSavedAt,
      checkForSavedPlan: state.checkForSavedPlan,
      setAutoSaveEnabled: state.setAutoSaveEnabled,
      savePlan: state.savePlan,
      loadPlan: state.loadPlan,
      clearSavedPlan: state.clearSavedPlan,
      resetAll: state.resetAll,
    }))
  );
}

/**
 * Hook for calculated leave result based on current wizard state.
 * Memoized to avoid recalculating on every render — only recalculates
 * when the underlying wizard inputs change.
 */
export function useCalculatedLeave(): LeaveResult {
  const { dueDate, coverage, rights, sharedWeeksToMother, daycareStartDate, daycareEnabled } =
    usePlannerStore(
      useShallow((state) => ({
        dueDate: state.dueDate,
        coverage: state.coverage,
        rights: state.rights,
        sharedWeeksToMother: state.sharedWeeksToMother,
        daycareStartDate: state.daycareStartDate,
        daycareEnabled: state.daycareEnabled,
      }))
    );

  const dueDateMs = dueDate.getTime();
  const daycareDateMs = daycareStartDate?.getTime() ?? 0;

  return useMemo(() => {
    const effectiveDaycareDate =
      daycareEnabled && daycareStartDate
        ? daycareStartDate
        : new Date(dueDate.getFullYear() + 3, 7, 1);

    return calculateLeave(
      dueDate,
      coverage,
      rights,
      sharedWeeksToMother,
      0,
      effectiveDaycareDate,
      [],
      undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDateMs, coverage, rights, sharedWeeksToMother, daycareDateMs, daycareEnabled]);
}

/**
 * Hook for checking if we can proceed to next wizard step
 */
export function useCanProceed(): boolean {
  const { currentStep, dueDate, rights, coverage } = usePlannerStore(
    useShallow((state) => ({
      currentStep: state.currentStep,
      dueDate: state.dueDate,
      rights: state.rights,
      coverage: state.coverage,
    }))
  );

  // All steps are valid by default since we have sensible defaults
  switch (currentStep) {
    case 1: // Due date
      return dueDate instanceof Date && !isNaN(dueDate.getTime());
    case 2: // Rights
      return ['both', 'mother-only', 'father-only'].includes(rights);
    case 3: // Coverage
      return coverage === 80 || coverage === 100;
    default:
      return true;
  }
}

/**
 * Hook for economy comparison between 80% and 100% scenarios.
 * Returns null if no salary data is available.
 */
export function useEconomyComparison(): EconomyResult | null {
  const { dueDate, rights, sharedWeeksToMother, daycareStartDate, daycareEnabled } =
    usePlannerStore(
      useShallow((state) => ({
        dueDate: state.dueDate,
        rights: state.rights,
        sharedWeeksToMother: state.sharedWeeksToMother,
        daycareStartDate: state.daycareStartDate,
        daycareEnabled: state.daycareEnabled,
      }))
    );

  const { motherEconomy, fatherEconomy } = usePlannerStore(
    useShallow((state) => ({
      motherEconomy: state.motherEconomy,
      fatherEconomy: state.fatherEconomy,
    }))
  );

  const dueDateMs = dueDate.getTime();
  const daycareDateMs = daycareStartDate?.getTime() ?? 0;

  return useMemo(() => {
    if (motherEconomy.monthlySalary <= 0) return null;

    const effectiveDaycare =
      daycareEnabled && daycareStartDate
        ? daycareStartDate
        : new Date(dueDate.getFullYear() + 3, 7, 1);

    const leave80 = calculateLeave(dueDate, 80, rights, sharedWeeksToMother, 0, effectiveDaycare);
    const leave100 = calculateLeave(dueDate, 100, rights, sharedWeeksToMother, 0, effectiveDaycare);

    return compareScenarios(
      motherEconomy,
      rights !== 'mother-only' ? fatherEconomy : undefined,
      sharedWeeksToMother,
      leave80.gap,
      leave100.gap,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDateMs, rights, sharedWeeksToMother, daycareDateMs, daycareEnabled, motherEconomy, fatherEconomy]);
}

/**
 * Hook for cumulative time series comparing 80% vs 100% scenarios.
 * Returns null if no salary data is available.
 */
export function useCumulativeTimeSeries(): TimeSeriesPoint[] | null {
  const { dueDate, rights, sharedWeeksToMother, daycareStartDate, daycareEnabled } =
    usePlannerStore(
      useShallow((state) => ({
        dueDate: state.dueDate,
        rights: state.rights,
        sharedWeeksToMother: state.sharedWeeksToMother,
        daycareStartDate: state.daycareStartDate,
        daycareEnabled: state.daycareEnabled,
      }))
    );

  const { motherEconomy, fatherEconomy } = usePlannerStore(
    useShallow((state) => ({
      motherEconomy: state.motherEconomy,
      fatherEconomy: state.fatherEconomy,
    }))
  );

  const dueDateMs = dueDate.getTime();
  const daycareDateMs = daycareStartDate?.getTime() ?? 0;

  return useMemo(() => {
    if (motherEconomy.monthlySalary <= 0) return null;

    const effectiveDaycare =
      daycareEnabled && daycareStartDate
        ? daycareStartDate
        : new Date(dueDate.getFullYear() + 3, 7, 1);

    return generateCumulativeTimeSeries(
      motherEconomy,
      rights !== 'mother-only' ? fatherEconomy : undefined,
      dueDate,
      rights,
      sharedWeeksToMother,
      effectiveDaycare,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDateMs, rights, sharedWeeksToMother, daycareDateMs, daycareEnabled, motherEconomy, fatherEconomy]);
}
