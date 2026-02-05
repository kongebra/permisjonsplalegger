'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '@/store';
import { PlannerCalendar, CalendarOnboarding } from '@/components/planner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, Undo2 } from 'lucide-react';

export default function KalenderPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    wizardCompleted,
    hasSavedPlan,
    checkForSavedPlan,
    loadPlan,
    savePlan,
    autoSaveEnabled,
    setAutoSaveEnabled,
    undoStack,
    undo,
  } = usePlannerStore(
    useShallow((state) => ({
      wizardCompleted: state.wizardCompleted,
      hasSavedPlan: state.hasSavedPlan,
      checkForSavedPlan: state.checkForSavedPlan,
      loadPlan: state.loadPlan,
      savePlan: state.savePlan,
      autoSaveEnabled: state.autoSaveEnabled,
      setAutoSaveEnabled: state.setAutoSaveEnabled,
      undoStack: state.undoStack,
      undo: state.undo,
    }))
  );

  // Mark as hydrated after first render (client-side only)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize store state and handle loading/redirect after hydration
  useEffect(() => {
    if (!isHydrated || isInitialized) return;

    // Check for saved plan in localStorage
    checkForSavedPlan();
    setIsInitialized(true);
  }, [isHydrated, isInitialized, checkForSavedPlan]);

  // Handle redirect and loading after initialization
  useEffect(() => {
    if (!isInitialized) return;

    // Redirect if wizard not completed and no saved plan
    if (!wizardCompleted && !hasSavedPlan) {
      router.push('/planlegger');
      return;
    }

    // Load saved plan if wizard not completed but plan exists
    if (!wizardCompleted && hasSavedPlan) {
      loadPlan();
    }
  }, [isInitialized, wizardCompleted, hasSavedPlan, loadPlan, router]);

  const handleSave = useCallback(() => {
    savePlan();
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
    }
  }, [savePlan, autoSaveEnabled, setAutoSaveEnabled]);

  // Show loading during SSR and initialization
  if (!isHydrated || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laster...</div>
      </div>
    );
  }

  // Show loading while redirecting
  if (!wizardCompleted && !hasSavedPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/planlegger">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Tilbake</span>
            </Button>
          </Link>

          <h1 className="text-lg font-semibold">Kalender</h1>

          <div className="flex items-center gap-2">
            {/* Undo button */}
            {undoStack.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                aria-label="Angre"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            )}

            {/* Save button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Lagre</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-4">
        <PlannerCalendar />
      </main>

      {/* Footer with auto-save indicator */}
      {autoSaveEnabled && (
        <footer className="border-t py-2 text-center text-xs text-muted-foreground">
          Autolagring aktivert
        </footer>
      )}

      {/* Onboarding overlay for first-time users */}
      <CalendarOnboarding />
    </div>
  );
}
