/**
 * Economy slice - manages salary and economy data for each parent
 */

import type { StateCreator } from 'zustand';
import type { ParentEconomy, Parent } from '@/lib/types';

const DEFAULT_ECONOMY: ParentEconomy = {
  monthlySalary: 0,
  monthlyCommissionLoss: 0,
  employerCoversAbove6G: false,
  employerPaysFeriepenger: false,
};

export interface EconomySlice {
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;

  // Actions
  setMotherEconomy: (economy: ParentEconomy) => void;
  setFatherEconomy: (economy: ParentEconomy) => void;
  setEconomy: (parent: Parent, economy: ParentEconomy) => void;
  resetEconomy: () => void;
}

export const createEconomySlice: StateCreator<
  EconomySlice,
  [],
  [],
  EconomySlice
> = (set) => ({
  motherEconomy: DEFAULT_ECONOMY,
  fatherEconomy: DEFAULT_ECONOMY,

  setMotherEconomy: (economy) => set({ motherEconomy: economy }),

  setFatherEconomy: (economy) => set({ fatherEconomy: economy }),

  setEconomy: (parent, economy) => {
    if (parent === 'mother') {
      set({ motherEconomy: economy });
    } else {
      set({ fatherEconomy: economy });
    }
  },

  resetEconomy: () =>
    set({
      motherEconomy: DEFAULT_ECONOMY,
      fatherEconomy: DEFAULT_ECONOMY,
    }),
});
