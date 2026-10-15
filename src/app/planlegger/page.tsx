"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { usePlannerStore } from "@/store";
import { loadPlanFromStorage } from "@/store/slices/persistenceSlice";
import { WizardContainer } from "@/components/wizard";
import { WelcomeBack } from "@/components/wizard/WelcomeBack";
import { TOTAL_WIZARD_STEPS } from "@/lib/constants";

// SSR-safe localStorage check via useSyncExternalStore
const emptySubscribe = () => () => {};

function getHasSavedPlan(): boolean {
  // Samme validering som loadPlan: ødelagt lagring regnes som ingen plan
  return loadPlanFromStorage() !== null;
}

/** Shimmer skeleton matching WelcomeIntro layout — shown during 'checking' phase */
function WizardSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[80dvh]">
      <div className="max-w-lg w-full space-y-6 animate-pulse">
        <div className="text-center space-y-3">
          <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto" />
          <div className="h-5 bg-muted rounded w-1/2 mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
        <div className="h-12 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

type UserChoice = "none" | "continue" | "new";

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

  // SSR-safe: null on server, boolean on client
  const liveHasSavedPlan = useSyncExternalStore(
    emptySubscribe,
    () => getHasSavedPlan(),
    () => null as boolean | null,
  );

  // Spørsmålet "fantes det en lagret plan da siden ble åpnet?" skal bare
  // avgjøres én gang. Veiviseren autolagrer underveis, og ruteren re-rendrer
  // siden når veiviseren oppdaterer #steg-N. Leser vi localStorage på nytt da,
  // bytter siden til "Velkommen tilbake" midt i veiviseren.
  const [hasSavedPlan, setHasSavedPlan] = useState<boolean | null>(null);
  if (hasSavedPlan === null && liveHasSavedPlan !== null) {
    setHasSavedPlan(liveHasSavedPlan);
  }

  const [userChoice, setUserChoice] = useState<UserChoice>("none");

  // Sync store with localStorage on mount
  useEffect(() => {
    checkForSavedPlan();
  }, [checkForSavedPlan]);

  // Redirect to calendar if wizard already completed
  useEffect(() => {
    if (wizardCompleted) {
      router.push("/planlegger/kalender");
    }
  }, [wizardCompleted, router]);

  const handleContinue = useCallback(() => {
    loadPlan();
    const store = usePlannerStore.getState();
    // Redirect to calendar if the plan was completed, or if the user was
    // on the final step (older saves have wizardCompleted:false due to
    // savePlan() running before completeWizard())
    if (store.wizardCompleted || store.currentStep >= TOTAL_WIZARD_STEPS) {
      if (!store.wizardCompleted) {
        store.completeWizard();
        store.savePlan();
      }
      router.push("/planlegger/kalender");
    } else {
      setUserChoice("continue");
    }
  }, [loadPlan, router]);

  const handleStartNew = useCallback(() => {
    resetAll();
    setUserChoice("new");
  }, [resetAll]);

  // Derive page state
  type PageState = "checking" | "returning" | "ready";
  let pageState: PageState;

  if (hasSavedPlan === null || (wizardCompleted && userChoice === "none")) {
    // SSR/hydration, or redirect to calendar is in progress
    pageState = "checking";
  } else if (hasSavedPlan && userChoice === "none" && !wizardCompleted) {
    // Has saved plan, user hasn't chosen yet
    pageState = "returning";
  } else {
    pageState = "ready";
  }

  return (
    <div className="bg-background">
      <main id="main" className="container mx-auto px-4 py-4">
        <h1 className="sr-only">Permisjonsøkonomi-kalkulator</h1>
        {pageState === "checking" && <WizardSkeleton />}
        {pageState === "returning" && (
          <WelcomeBack onContinue={handleContinue} onStartNew={handleStartNew} />
        )}
        {pageState === "ready" && (
          <WizardContainer skipIntro={userChoice === "continue"} />
        )}
      </main>
    </div>
  );
}
