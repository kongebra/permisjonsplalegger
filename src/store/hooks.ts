/**
 * Convenience hooks for accessing store slices
 * Uses useShallow for proper React 19 SSR compatibility
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from './index';
import type { LeaveResult, EconomyResult, TimeSeriesPoint } from '@/lib/types';
import { calculateLeave, subtractWeeks, weeksBetween } from '@/lib/calculator';
import { LEAVE_CONFIG } from '@/lib/constants';
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
      prematureBirthDate: state.prematureBirthDate,
      monthlyBudgetLimit: state.monthlyBudgetLimit,
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
      setPrematureBirthDate: state.setPrematureBirthDate,
      setMonthlyBudgetLimit: state.setMonthlyBudgetLimit,
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
  const { dueDate, coverage, rights, sharedWeeksToMother, daycareStartDate, daycareEnabled, prematureBirthDate } =
    usePlannerStore(
      useShallow((state) => ({
        dueDate: state.dueDate,
        coverage: state.coverage,
        rights: state.rights,
        sharedWeeksToMother: state.sharedWeeksToMother,
        daycareStartDate: state.daycareStartDate,
        daycareEnabled: state.daycareEnabled,
        prematureBirthDate: state.prematureBirthDate,
      }))
    );

  const dueDateMs = dueDate.getTime();
  const daycareDateMs = daycareStartDate?.getTime() ?? 0;
  const prematureBirthDateMs = prematureBirthDate?.getTime() ?? 0;

  return useMemo(() => {
    const effectiveDaycareDate =
      daycareEnabled && daycareStartDate
        ? daycareStartDate
        : new Date(dueDate.getFullYear() + 3, 7, 1);

    // Premature weeks = weeks between actual birth and planned leave start.
    // NAV only extends leave when born more than 7 weeks before due date (before uke 33).
    const normalLeaveStart = subtractWeeks(dueDate, LEAVE_CONFIG[coverage].preBirth);
    const prematureWeeks =
      prematureBirthDate && prematureBirthDate < subtractWeeks(dueDate, 7)
        ? Math.max(0, Math.round(weeksBetween(prematureBirthDate, normalLeaveStart)))
        : 0;

    return calculateLeave(
      dueDate,
      coverage,
      rights,
      sharedWeeksToMother,
      0,
      effectiveDaycareDate,
      [],
      undefined,
      prematureWeeks,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDateMs, coverage, rights, sharedWeeksToMother, daycareDateMs, daycareEnabled, prematureBirthDateMs]);
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
  const { dueDate, coverage, rights, sharedWeeksToMother, daycareStartDate, daycareEnabled, prematureBirthDate } =
    usePlannerStore(
      useShallow((state) => ({
        dueDate: state.dueDate,
        coverage: state.coverage,
        rights: state.rights,
        sharedWeeksToMother: state.sharedWeeksToMother,
        daycareStartDate: state.daycareStartDate,
        daycareEnabled: state.daycareEnabled,
        prematureBirthDate: state.prematureBirthDate,
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
  const prematureBirthDateMs = prematureBirthDate?.getTime() ?? 0;

  return useMemo(() => {
    if (motherEconomy.monthlySalary <= 0) return null;

    const effectiveDaycare =
      daycareEnabled && daycareStartDate
        ? daycareStartDate
        : new Date(dueDate.getFullYear() + 3, 7, 1);

    // preBirth is 3 for both 80% and 100%, so prematureWeeks is the same for both scenarios
    const normalLeaveStart = subtractWeeks(dueDate, LEAVE_CONFIG[coverage].preBirth);
    const prematureWeeks =
      prematureBirthDate && prematureBirthDate < subtractWeeks(dueDate, 7)
        ? Math.max(0, Math.round(weeksBetween(prematureBirthDate, normalLeaveStart)))
        : 0;

    const leave80 = calculateLeave(dueDate, 80, rights, sharedWeeksToMother, 0, effectiveDaycare, [], undefined, prematureWeeks);
    const leave100 = calculateLeave(dueDate, 100, rights, sharedWeeksToMother, 0, effectiveDaycare, [], undefined, prematureWeeks);

    return compareScenarios(
      motherEconomy,
      rights !== 'mother-only' ? fatherEconomy : undefined,
      sharedWeeksToMother,
      leave80.gap,
      leave100.gap,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDateMs, coverage, rights, sharedWeeksToMother, daycareDateMs, daycareEnabled, prematureBirthDateMs, motherEconomy, fatherEconomy]);
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
