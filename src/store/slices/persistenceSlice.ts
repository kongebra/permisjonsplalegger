/**
 * Persistence slice - manages saving/loading plans to localStorage
 */

import type { StateCreator } from 'zustand';
import type { SavedPlan, CustomPeriod } from '@/lib/types';

const STORAGE_KEY = 'permisjonsplan-v1';

export interface PersistenceSlice {
  hasSavedPlan: boolean;
  autoSaveEnabled: boolean;
  lastSavedAt: Date | null;

  // Actions
  checkForSavedPlan: () => boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  markAsSaved: () => void;
  clearSavedPlan: () => void;
}

// Helper to serialize dates
function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

// Helper to deserialize dates
function deserializeDate(dateStr: string | null): Date | null {
  return dateStr ? new Date(dateStr) : null;
}

// Helper to serialize periods
function serializePeriods(periods: CustomPeriod[]): SavedPlan['periods'] {
  return periods.map((p) => ({
    id: p.id,
    type: p.type,
    parent: p.parent,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    label: p.label,
    color: p.color,
    isFromWizard: p.isFromWizard,
    isLocked: p.isLocked,
    segmentType: p.segmentType,
  }));
}

// Helper to deserialize periods
function deserializePeriods(periods: SavedPlan['periods']): CustomPeriod[] {
  return periods.map((p) => ({
    id: p.id,
    type: p.type,
    parent: p.parent,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
    label: p.label,
    color: p.color,
    isFromWizard: p.isFromWizard,
    isLocked: p.isLocked,
    segmentType: p.segmentType,
  }));
}

export const createPersistenceSlice: StateCreator<
  PersistenceSlice,
  [],
  [],
  PersistenceSlice
> = (set) => ({
  hasSavedPlan: false,
  autoSaveEnabled: false,
  lastSavedAt: null,

  checkForSavedPlan: () => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const hasSaved = saved !== null;
      set({ hasSavedPlan: hasSaved });
      return hasSaved;
    } catch {
      return false;
    }
  },

  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),

  markAsSaved: () => set({ lastSavedAt: new Date(), hasSavedPlan: true }),

  clearSavedPlan: () => {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* private browsing */ }
    }
    set({ hasSavedPlan: false, autoSaveEnabled: false, lastSavedAt: null });
  },
});

// Standalone functions for save/load (used by store actions)
export function savePlanToStorage(plan: SavedPlan): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch { /* quota exceeded or private browsing */ }
}

export function loadPlanFromStorage(): SavedPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as SavedPlan;
  } catch {
    return null;
  }
}

export { serializeDate, deserializeDate, serializePeriods, deserializePeriods };
