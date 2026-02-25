/**
 * Combined Zustand store for the interactive planner
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createWizardSlice, type WizardSlice } from './slices/wizardSlice';
import { createJobSettingsSlice, type JobSettingsSlice } from './slices/jobSettingsSlice';
import { createPeriodsSlice, type PeriodsSlice } from './slices/periodsSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createEconomySlice, type EconomySlice } from './slices/economySlice';
import {
  createPersistenceSlice,
  savePlanToStorage,
  loadPlanFromStorage,
  deserializePeriods,
  serializePeriods,
  type PersistenceSlice,
} from './slices/persistenceSlice';
import type { SavedPlan, Coverage, ParentRights, ParentEconomy } from '@/lib/types';
import { calculateLeave } from '@/lib/calculator';
import { reinitializePreservingUserPeriods } from '@/lib/planner/initialize-periods';

// Combined store type
export type PlannerStore = WizardSlice &
  JobSettingsSlice &
  PeriodsSlice &
  UiSlice &
  PersistenceSlice &
  EconomySlice & {
    // Cross-slice actions
    savePlan: () => void;
    loadPlan: () => boolean;
    resetAll: () => void;
    recalculateFromSettings: (settings: {
      dueDate: Date;
      rights: ParentRights;
      coverage: Coverage;
      sharedWeeksToMother: number;
      daycareStartDate: Date | null;
      daycareEnabled: boolean;
      motherEconomy: ParentEconomy;
      fatherEconomy: ParentEconomy;
    }) => void;
  };

export const usePlannerStore = create<PlannerStore>()(
  subscribeWithSelector((...a) => ({
    ...createWizardSlice(...a),
    ...createJobSettingsSlice(...a),
    ...createPeriodsSlice(...a),
    ...createUiSlice(...a),
    ...createPersistenceSlice(...a),
    ...createEconomySlice(...a),

    // Save entire plan to localStorage
    savePlan: () => {
      const state = usePlannerStore.getState();

      const plan: SavedPlan = {
        version: 1,
        savedAt: new Date().toISOString(),
        wizard: {
          currentStep: state.currentStep,
          wizardCompleted: state.wizardCompleted,
          dueDate: state.dueDate.toISOString(),
          rights: state.rights,
          coverage: state.coverage,
          sharedWeeksToMother: state.sharedWeeksToMother,
          daycareStartDate: state.daycareStartDate?.toISOString() ?? null,
          daycareEnabled: state.daycareEnabled,
          prematureBirthDate: state.prematureBirthDate?.toISOString() ?? null,
        },
        jobSettings: {
          mother: state.motherJobSettings,
          father: state.fatherJobSettings,
        },
        economy: {
          mother: state.motherEconomy,
          father: state.fatherEconomy,
        },
        periods: serializePeriods(state.periods),
        autoSaveEnabled: state.autoSaveEnabled,
      };

      savePlanToStorage(plan);
      state.markAsSaved();
    },

    // Load plan from localStorage
    loadPlan: () => {
      const plan = loadPlanFromStorage();
      if (!plan) return false;

      const state = usePlannerStore.getState();

      // Restore wizard state
      state.setDueDate(new Date(plan.wizard.dueDate));
      state.setRights(plan.wizard.rights);
      state.setCoverage(plan.wizard.coverage);
      state.setSharedWeeksToMother(plan.wizard.sharedWeeksToMother);
      state.setDaycareEnabled(plan.wizard.daycareEnabled);
      if (plan.wizard.daycareStartDate) {
        state.setDaycareStartDate(new Date(plan.wizard.daycareStartDate));
      }

      // Restore premature birth date if present
      state.setPrematureBirthDate(
        plan.wizard.prematureBirthDate ? new Date(plan.wizard.prematureBirthDate) : null
      );

      // Restore wizard progress or mark as completed
      if (plan.wizard.wizardCompleted !== false) {
        state.completeWizard();
      }
      if (plan.wizard.currentStep) {
        state.setCurrentStep(plan.wizard.currentStep);
      }

      // Restore job settings
      state.setMotherJobSettings(plan.jobSettings.mother);
      state.setFatherJobSettings(plan.jobSettings.father);

      // Restore economy settings (if present in saved plan)
      if (plan.economy) {
        state.setMotherEconomy(plan.economy.mother);
        state.setFatherEconomy(plan.economy.father);
      }

      // Restore periods
      state.setPeriods(deserializePeriods(plan.periods));

      // Restore persistence state
      state.setAutoSaveEnabled(plan.autoSaveEnabled);
      state.markAsSaved();

      return true;
    },

    // Recalculate wizard periods from new settings, preserving user periods
    recalculateFromSettings: (settings) => {
      const state = usePlannerStore.getState();

      // Update wizard state
      state.setDueDate(settings.dueDate);
      state.setRights(settings.rights);
      state.setCoverage(settings.coverage);
      state.setSharedWeeksToMother(settings.sharedWeeksToMother);
      state.setDaycareEnabled(settings.daycareEnabled);
      if (settings.daycareStartDate) {
        state.setDaycareStartDate(settings.daycareStartDate);
      }

      // Update economy state
      state.setMotherEconomy(settings.motherEconomy);
      state.setFatherEconomy(settings.fatherEconomy);

      // Recalculate leave with new settings
      const effectiveDaycareDate =
        settings.daycareEnabled && settings.daycareStartDate
          ? settings.daycareStartDate
          : new Date(settings.dueDate.getFullYear() + 3, 7, 1);

      const newLeaveResult = calculateLeave(
        settings.dueDate,
        settings.coverage,
        settings.rights,
        settings.sharedWeeksToMother,
        0,
        effectiveDaycareDate,
      );

      // Reinitialize: replace wizard periods, keep user periods
      const newPeriods = reinitializePreservingUserPeriods(
        state.periods,
        newLeaveResult,
      );
      state.setPeriods(newPeriods);
    },

    // Reset everything
    resetAll: () => {
      // Cancel any pending auto-save to prevent re-saving cleared data
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
      }

      const state = usePlannerStore.getState();
      state.resetWizard();
      state.resetJobSettings();
      state.resetEconomy();
      state.clearPeriods();
      state.resetUi();
      state.clearSavedPlan();
    },
  }))
);

// Auto-save subscription (debounced)
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

usePlannerStore.subscribe(
  (state) => ({
    autoSaveEnabled: state.autoSaveEnabled,
    wizardCompleted: state.wizardCompleted,
    currentStep: state.currentStep,
    dueDate: state.dueDate,
    rights: state.rights,
    coverage: state.coverage,
    sharedWeeksToMother: state.sharedWeeksToMother,
    daycareStartDate: state.daycareStartDate,
    daycareEnabled: state.daycareEnabled,
    motherJobSettings: state.motherJobSettings,
    fatherJobSettings: state.fatherJobSettings,
    motherEconomy: state.motherEconomy,
    fatherEconomy: state.fatherEconomy,
    periods: state.periods,
  }),
  (curr, prev) => {
    // Auto-save when wizard step changes (saves progress)
    // or when autoSave is enabled and wizard is completed
    const wizardStepChanged = curr.currentStep !== prev.currentStep;
    const postWizardChange = curr.autoSaveEnabled && curr.wizardCompleted;

    if (!wizardStepChanged && !postWizardChange) return;

    // Skip auto-save after resetAll() — wizard was completed but is now reset
    if (wizardStepChanged && prev.wizardCompleted && !curr.wizardCompleted) return;

    // Skip if nothing changed (for post-wizard saves)
    if (!wizardStepChanged && JSON.stringify(curr) === JSON.stringify(prev)) return;

    // Debounce auto-save
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
      usePlannerStore.getState().savePlan();
    }, wizardStepChanged ? 500 : 2000);
  }
);

// Dev-only: logg state til console slik at next-devtools-mcp get_logs kan plukke det opp
if (process.env.NODE_ENV === 'development') {
  usePlannerStore.subscribe(
    (state) => ({
      dueDate: state.dueDate,
      rights: state.rights,
      coverage: state.coverage,
      sharedWeeksToMother: state.sharedWeeksToMother,
      daycareStartDate: state.daycareStartDate,
      daycareEnabled: state.daycareEnabled,
      motherEconomy: state.motherEconomy,
      fatherEconomy: state.fatherEconomy,
      motherJobSettings: state.motherJobSettings,
      fatherJobSettings: state.fatherJobSettings,
      periods: state.periods.length,
    }),
    (curr) => {
      console.log('[planner-state]', JSON.stringify(curr, null, 2));
    }
  );
}

// Export types
export type { WizardSlice } from './slices/wizardSlice';
export type { JobSettingsSlice } from './slices/jobSettingsSlice';
export type { PeriodsSlice } from './slices/periodsSlice';
export type { UiSlice } from './slices/uiSlice';
export type { PersistenceSlice } from './slices/persistenceSlice';
export type { EconomySlice } from './slices/economySlice';
