'use client';

import { useEffect, useCallback, useSyncExternalStore, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '@/store';
import { PlannerCalendar, CalendarOnboarding, CalendarSkeleton } from '@/components/planner';
import dynamic from 'next/dynamic';
import posthog from 'posthog-js';

const PlannerEconomy = dynamic(
  () => import('@/components/planner/PlannerEconomy').then(m => ({ default: m.PlannerEconomy }))
);
const SettingsSheet = dynamic(
  () => import('@/components/planner/SettingsSheet').then(m => ({ default: m.SettingsSheet }))
);
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Undo2, Settings } from 'lucide-react';

const emptySubscribe = () => () => {};

export default function KalenderPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const hasTrackedEconomyView = useRef(false);

  const handleTabChange = (value: string) => {
    if (value === 'okonomi' && !hasTrackedEconomyView.current) {
      hasTrackedEconomyView.current = true;
      posthog.capture('economy_comparison_viewed');
    }
  };

  const {
    wizardCompleted,
    checkForSavedPlan,
    savePlan,
    autoSaveEnabled,
    setAutoSaveEnabled,
    undoStack,
    undo,
    showSettings,
    setShowSettings,
  } = usePlannerStore(
    useShallow((state) => ({
      wizardCompleted: state.wizardCompleted,
      checkForSavedPlan: state.checkForSavedPlan,
      savePlan: state.savePlan,
      autoSaveEnabled: state.autoSaveEnabled,
      setAutoSaveEnabled: state.setAutoSaveEnabled,
      undoStack: state.undoStack,
      undo: state.undo,
      showSettings: state.showSettings,
      setShowSettings: state.setShowSettings,
    }))
  );

  // Initialize: check localStorage, then redirect or load saved plan
  useEffect(() => {
    checkForSavedPlan();

    const { wizardCompleted: wc, hasSavedPlan: hsp } = usePlannerStore.getState();

    if (!wc && !hsp) {
      router.push('/planlegger');
      return;
    }

    if (!wc && hsp) {
      usePlannerStore.getState().loadPlan();
    }
  }, [checkForSavedPlan, router]);

  const handleSave = useCallback(() => {
    savePlan();
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
    }
  }, [savePlan, autoSaveEnabled, setAutoSaveEnabled]);

  // Show skeleton during SSR or before initialization completes
  if (!isClient || !wizardCompleted) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Permisjonsplanlegger</h1>

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

            {/* Settings button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              aria-label="Innstillinger"
            >
              <Settings className="w-4 h-4" />
            </Button>

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
      <main id="main" className="flex-1 container mx-auto px-4 py-4">
        <Tabs defaultValue="kalender" onValueChange={handleTabChange}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="kalender" className="flex-1">Kalender</TabsTrigger>
            <TabsTrigger value="okonomi" className="flex-1">Økonomi</TabsTrigger>
          </TabsList>
          <TabsContent value="kalender">
            <PlannerCalendar />
          </TabsContent>
          <TabsContent value="okonomi">
            <PlannerEconomy />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer with auto-save indicator */}
      {autoSaveEnabled && (
        <footer className="border-t py-2 text-center text-xs text-muted-foreground">
          Autolagring aktivert
        </footer>
      )}

      {/* Settings sheet */}
      <SettingsSheet open={showSettings} onOpenChange={setShowSettings} />

      {/* Onboarding overlay for first-time users */}
      <CalendarOnboarding />
    </div>
  );
}
