/**
 * Wizard slice - manages wizard step state and basic leave configuration
 */

import type { StateCreator } from 'zustand';
import type { Coverage, ParentRights } from '@/lib/types';
import { getDefaultDaycareStart, getDefaultSharedWeeksToMother } from '@/lib/calculator';
import { LEAVE_CONFIG } from '@/lib/constants';

export interface WizardSlice {
  // Wizard state
  currentStep: number;
  wizardCompleted: boolean;

  // Leave configuration
  dueDate: Date;
  rights: ParentRights;
  coverage: Coverage;
  sharedWeeksToMother: number;
  daycareStartDate: Date | null;
  daycareEnabled: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeWizard: () => void;
  resetWizard: () => void;

  setDueDate: (date: Date) => void;
  setRights: (rights: ParentRights) => void;
  setCoverage: (coverage: Coverage) => void;
  setSharedWeeksToMother: (weeks: number) => void;
  setDaycareStartDate: (date: Date | null) => void;
  setDaycareEnabled: (enabled: boolean) => void;
}

const TOTAL_STEPS = 7; // Including summary

export const createWizardSlice: StateCreator<WizardSlice, [], [], WizardSlice> = (
  set,
  get
) => ({
  // Initial state
  currentStep: 1,
  wizardCompleted: false,
  dueDate: new Date(),
  rights: 'both',
  coverage: 100,
  sharedWeeksToMother: getDefaultSharedWeeksToMother(100),
  daycareStartDate: getDefaultDaycareStart(new Date()),
  daycareEnabled: true,

  // Navigation actions
  setCurrentStep: (step) => set({ currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)) }),

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < TOTAL_STEPS) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  completeWizard: () => set({ wizardCompleted: true }),

  resetWizard: () =>
    set({
      currentStep: 1,
      wizardCompleted: false,
      dueDate: new Date(),
      rights: 'both',
      coverage: 100,
      sharedWeeksToMother: getDefaultSharedWeeksToMother(100),
      daycareStartDate: getDefaultDaycareStart(new Date()),
      daycareEnabled: true,
    }),

  // Configuration actions
  setDueDate: (date) => {
    const { daycareEnabled, daycareStartDate } = get();
    // Auto-update daycare date if it hasn't been manually set
    if (daycareEnabled && daycareStartDate) {
      const defaultDaycare = getDefaultDaycareStart(date);
      set({ dueDate: date, daycareStartDate: defaultDaycare });
    } else {
      set({ dueDate: date });
    }
  },

  setRights: (rights) => set({ rights }),

  setCoverage: (coverage) => {
    const { sharedWeeksToMother, coverage: oldCoverage } = get();
    // Preserve ratio when switching coverage
    const oldConfig = LEAVE_CONFIG[oldCoverage];
    const newConfig = LEAVE_CONFIG[coverage];
    const ratio = sharedWeeksToMother / oldConfig.shared;
    const newShared = Math.round(ratio * newConfig.shared);
    set({ coverage, sharedWeeksToMother: newShared });
  },

  setSharedWeeksToMother: (weeks) => set({ sharedWeeksToMother: weeks }),

  setDaycareStartDate: (date) => set({ daycareStartDate: date }),

  setDaycareEnabled: (enabled) => {
    if (enabled) {
      const { dueDate } = get();
      set({ daycareEnabled: true, daycareStartDate: getDefaultDaycareStart(dueDate) });
    } else {
      set({ daycareEnabled: false, daycareStartDate: null });
    }
  },
});
