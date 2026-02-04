/**
 * Job settings slice - manages job type and vacation days for each parent
 */

import type { StateCreator } from 'zustand';
import type { JobSettings, Parent } from '@/lib/types';

export interface JobSettingsSlice {
  motherJobSettings: JobSettings | null;
  fatherJobSettings: JobSettings | null;

  // Actions
  setMotherJobSettings: (settings: JobSettings | null) => void;
  setFatherJobSettings: (settings: JobSettings | null) => void;
  setJobSettings: (parent: Parent, settings: JobSettings | null) => void;
  resetJobSettings: () => void;
}

export const createJobSettingsSlice: StateCreator<
  JobSettingsSlice,
  [],
  [],
  JobSettingsSlice
> = (set) => ({
  motherJobSettings: null,
  fatherJobSettings: null,

  setMotherJobSettings: (settings) => set({ motherJobSettings: settings }),

  setFatherJobSettings: (settings) => set({ fatherJobSettings: settings }),

  setJobSettings: (parent, settings) => {
    if (parent === 'mother') {
      set({ motherJobSettings: settings });
    } else {
      set({ fatherJobSettings: settings });
    }
  },

  resetJobSettings: () =>
    set({
      motherJobSettings: null,
      fatherJobSettings: null,
    }),
});
