"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "@/store";
import { WizardContainer } from "@/components/wizard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

// Check localStorage on client side only
function checkLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("permisjonsplan-v1");
  return saved !== null;
}

export default function PlanleggerPage() {
  const router = useRouter();
  const { loadPlan, wizardCompleted, resetAll, checkForSavedPlan } =
    usePlannerStore(
      useShallow((state) => ({
        loadPlan: state.loadPlan,
        wizardCompleted: state.wizardCompleted,
        resetAll: state.resetAll,
        checkForSavedPlan: state.checkForSavedPlan,
      })),
    );

  // Initialize dialog state based on localStorage (computed once)
  const [dialogDismissed, setDialogDismissed] = useState(false);

  // Check if there's a saved plan (computed once on mount, not every render)
  const [hasSavedPlan] = useState(() => checkLocalStorage());

  // Sync store state with localStorage check
  useEffect(() => {
    checkForSavedPlan();
  }, [checkForSavedPlan]);

  // If wizard is already completed, redirect to calendar
  useEffect(() => {
    if (wizardCompleted) {
      router.push("/planlegger/kalender");
    }
  }, [wizardCompleted, router]);

  const handleContinue = useCallback(() => {
    loadPlan();
    setDialogDismissed(true);
  }, [loadPlan]);

  const handleStartNew = useCallback(() => {
    resetAll();
    setDialogDismissed(true);
  }, [resetAll]);

  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setDialogDismissed(true);
    }
  }, []);

  // Show dialog only if: has saved plan, wizard not completed, and not dismissed
  const showDialog = hasSavedPlan && !wizardCompleted && !dialogDismissed;

  return (
    <div className="min-h-dvh bg-background">
      {/* <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Permisjonsplanlegger</h1>
            <p className="text-sm text-muted-foreground">
              Planlegg foreldrepermisjonen steg for steg
            </p>
          </div>
          <Link href="/gammel">
            <Button variant="ghost" size="sm">
              Gammel kalkulator
            </Button>
          </Link>
        </div>
      </header> */}

      <main className="container mx-auto px-4 py-4">
        <WizardContainer />
      </main>

      {/* Continue dialog */}
      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fortsett der du slapp?</DialogTitle>
            <DialogDescription>
              Du har en lagret plan fra tidligere. Vil du fortsette med den
              eller starte på nytt?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={handleContinue}>Fortsett</Button>
            <Button variant="outline" onClick={handleStartNew}>
              Start på nytt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disclaimer vises én gang i WelcomeIntro */}
    </div>
  );
}
