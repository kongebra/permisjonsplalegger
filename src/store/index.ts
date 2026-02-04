/**
 * Combined Zustand store for the interactive planner
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createWizardSlice, type WizardSlice } from './slices/wizardSlice';
import { createJobSettingsSlice, type JobSettingsSlice } from './slices/jobSettingsSlice';
import { createPeriodsSlice, type PeriodsSlice } from './slices/periodsSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import {
  createPersistenceSlice,
  savePlanToStorage,
  loadPlanFromStorage,
  deserializePeriods,
  serializePeriods,
  type PersistenceSlice,
} from './slices/persistenceSlice';
import type { SavedPlan } from '@/lib/types';

// Combined store type
export type PlannerStore = WizardSlice &
  JobSettingsSlice &
  PeriodsSlice &
  UiSlice &
  PersistenceSlice & {
    // Cross-slice actions
    savePlan: () => void;
    loadPlan: () => boolean;
    resetAll: () => void;
  };

export const usePlannerStore = create<PlannerStore>()(
  subscribeWithSelector((...a) => ({
    ...createWizardSlice(...a),
    ...createJobSettingsSlice(...a),
    ...createPeriodsSlice(...a),
    ...createUiSlice(...a),
    ...createPersistenceSlice(...a),

    // Save entire plan to localStorage
    savePlan: () => {
      const state = usePlannerStore.getState();

      const plan: SavedPlan = {
        version: 1,
        savedAt: new Date().toISOString(),
        wizard: {
          dueDate: state.dueDate.toISOString(),
          rights: state.rights,
          coverage: state.coverage,
          sharedWeeksToMother: state.sharedWeeksToMother,
          daycareStartDate: state.daycareStartDate?.toISOString() ?? null,
          daycareEnabled: state.daycareEnabled,
        },
        jobSettings: {
          mother: state.motherJobSettings,
          father: state.fatherJobSettings,
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
      state.completeWizard();

      // Restore job settings
      state.setMotherJobSettings(plan.jobSettings.mother);
      state.setFatherJobSettings(plan.jobSettings.father);

      // Restore periods
      state.setPeriods(deserializePeriods(plan.periods));

      // Restore persistence state
      state.setAutoSaveEnabled(plan.autoSaveEnabled);
      state.markAsSaved();

      return true;
    },

    // Reset everything
    resetAll: () => {
      const state = usePlannerStore.getState();
      state.resetWizard();
      state.resetJobSettings();
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
    dueDate: state.dueDate,
    rights: state.rights,
    coverage: state.coverage,
    sharedWeeksToMother: state.sharedWeeksToMother,
    daycareStartDate: state.daycareStartDate,
    daycareEnabled: state.daycareEnabled,
    motherJobSettings: state.motherJobSettings,
    fatherJobSettings: state.fatherJobSettings,
    periods: state.periods,
  }),
  (curr, prev) => {
    // Only auto-save if enabled and wizard is completed
    if (!curr.autoSaveEnabled || !curr.wizardCompleted) return;

    // Skip if nothing changed
    if (JSON.stringify(curr) === JSON.stringify(prev)) return;

    // Debounce auto-save
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
      usePlannerStore.getState().savePlan();
    }, 2000);
  }
);

// Export types
export type { WizardSlice } from './slices/wizardSlice';
export type { JobSettingsSlice } from './slices/jobSettingsSlice';
export type { PeriodsSlice } from './slices/periodsSlice';
export type { UiSlice } from './slices/uiSlice';
export type { PersistenceSlice } from './slices/persistenceSlice';
