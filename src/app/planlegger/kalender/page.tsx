'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlannerStore } from '@/store';
import { PlannerCalendar } from '@/components/planner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, Undo2 } from 'lucide-react';

// Check localStorage on client side only
function checkLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('permisjonsplan-v1');
  return saved !== null;
}

export default function KalenderPage() {
  const router = useRouter();
  const hasCheckedRef = useRef(false);

  const {
    wizardCompleted,
    checkForSavedPlan,
    loadPlan,
    savePlan,
    autoSaveEnabled,
    setAutoSaveEnabled,
    undoStack,
    undo,
  } = usePlannerStore();

  // Check for saved plan synchronously before first render
  const hasSavedPlan = checkLocalStorage();

  // Determine if we need to redirect
  const needsRedirect = !wizardCompleted && !hasSavedPlan;

  // Sync store state and handle loading/redirect
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    checkForSavedPlan();

    if (needsRedirect) {
      router.push('/planlegger');
      return;
    }

    // If not completed but has saved plan, try to load it
    if (!wizardCompleted && hasSavedPlan) {
      loadPlan();
    }
  }, [needsRedirect, wizardCompleted, hasSavedPlan, checkForSavedPlan, loadPlan, router]);

  const handleSave = useCallback(() => {
    savePlan();
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
    }
  }, [savePlan, autoSaveEnabled, setAutoSaveEnabled]);

  // Show loading while redirecting
  if (needsRedirect) {
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
    </div>
  );
}
