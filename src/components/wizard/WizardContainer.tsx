"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "./WizardProgress";
import { WelcomeIntro } from "./WelcomeIntro";
import { SetupLoader, SETUP_LOADER_DURATION } from "./SetupLoader";
import { DueDateStep } from "./steps/DueDateStep";
import { RightsStep } from "./steps/RightsStep";
import { CoverageStep } from "./steps/CoverageStep";
import { DistributionStep } from "./steps/DistributionStep";
import { DaycareStep } from "./steps/DaycareStep";
import { JobSettingsStep } from "./steps/JobSettingsStep";
import { EconomyStep } from "./steps/EconomyStep";
import { SummaryStep } from "./steps/SummaryStep";
import {
  useWizard,
  useJobSettings,
  useEconomy,
  useCalculatedLeave,
  useCanProceed,
} from "@/store/hooks";
import { usePlannerStore } from "@/store";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { TOTAL_WIZARD_STEPS } from "@/lib/constants";
import posthog from "posthog-js";

interface WizardContainerProps {
  skipIntro?: boolean;
}

export function WizardContainer({ skipIntro = false }: WizardContainerProps) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(!skipIntro);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [cameFromSummary, setCameFromSummary] = useState(false);
  const stepContentRef = useRef<HTMLDivElement>(null);

  // Wizard state
  const {
    currentStep,
    dueDate,
    rights,
    coverage,
    sharedWeeksToMother,
    daycareStartDate,
    daycareEnabled,
    setCurrentStep,
    nextStep,
    prevStep,
    setDueDate,
    setRights,
    setCoverage,
    setSharedWeeksToMother,
    setDaycareStartDate,
    setDaycareEnabled,
    completeWizard,
  } = useWizard();

  // Animation direction tracking (must be after useWizard)
  const [animState, setAnimState] = useState({
    prevStep: currentStep,
    dir: "forward" as "forward" | "backward",
  });

  // Job settings
  const {
    motherJobSettings,
    fatherJobSettings,
    setMotherJobSettings,
    setFatherJobSettings,
  } = useJobSettings();

  // Economy data
  const { motherEconomy, fatherEconomy, setMotherEconomy, setFatherEconomy } =
    useEconomy();

  // Persistence
  const savePlan = usePlannerStore((state) => state.savePlan);

  // Derive animation direction from step change (state-during-render pattern)
  if (animState.prevStep !== currentStep) {
    setAnimState({
      prevStep: currentStep,
      dir: currentStep >= animState.prevStep ? "forward" : "backward",
    });
  }
  const direction = animState.dir;

  // Focus step content on step change (a11y)
  useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Sync wizard step with browser history for back button support
  // Only active when intro is dismissed (avoid polluting history during intro)
  const isPopstateRef = useRef(false);

  useEffect(() => {
    if (showIntro) return;
    // Push new history state when step changes (but not from popstate)
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }
    window.history.pushState(
      { wizardStep: currentStep },
      "",
      `#steg-${currentStep}`,
    );
  }, [currentStep, showIntro]);

  useEffect(() => {
    if (showIntro) return;

    const handlePopstate = (e: PopStateEvent) => {
      const step = e.state?.wizardStep;
      if (typeof step === "number" && step >= 1 && step <= TOTAL_WIZARD_STEPS) {
        isPopstateRef.current = true;
        setCurrentStep(step);
      }
    };

    // Set initial history state
    window.history.replaceState(
      { wizardStep: currentStep },
      "",
      `#steg-${currentStep}`,
    );
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [showIntro]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate leave result
  const leaveResult = useCalculatedLeave();

  // Check if we can proceed to next step
  const canProceed = useCanProceed();

  // Handle editing from summary
  const handleGoBackFromSummary = (step: number) => {
    setCameFromSummary(true);
    setCurrentStep(step);
  };

  // Handle returning to summary
  const handleReturnToSummary = () => {
    setCameFromSummary(false);
    setCurrentStep(TOTAL_WIZARD_STEPS);
  };

  // Clear flag when arriving at summary normally (state-during-render)
  if (cameFromSummary && currentStep === TOTAL_WIZARD_STEPS) {
    setCameFromSummary(false);
  }

  // Handle wizard completion — show branded loader, then navigate
  const handleComplete = () => {
    posthog.capture("wizard_completed", {
      coverage,
      rights,
      has_economy_data: !!(motherEconomy?.monthlySalary || fatherEconomy?.monthlySalary),
      daycare_enabled: daycareEnabled,
    });
    savePlan();
    setIsSettingUp(true);
  };

  // Complete wizard and navigate after loader display time
  useEffect(() => {
    if (!isSettingUp) return;
    const timer = setTimeout(() => {
      completeWizard();
      // Re-save so the persisted plan has wizardCompleted: true
      usePlannerStore.getState().savePlan();
      router.push("/planlegger/kalender");
    }, SETUP_LOADER_DURATION);
    return () => clearTimeout(timer);
  }, [isSettingUp, completeWizard, router]);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <DueDateStep value={dueDate} onChange={setDueDate} />;
      case 2:
        return <RightsStep value={rights} onChange={setRights} />;
      case 3:
        return <CoverageStep value={coverage} onChange={setCoverage} />;
      case 4:
        return (
          <DistributionStep
            coverage={coverage}
            rights={rights}
            sharedWeeksToMother={sharedWeeksToMother}
            onChange={setSharedWeeksToMother}
          />
        );
      case 5:
        return (
          <DaycareStep
            dueDate={dueDate}
            daycareDate={daycareStartDate}
            daycareEnabled={daycareEnabled}
            leaveEndDate={leaveResult.father.end}
            onDateChange={setDaycareStartDate}
            onEnabledChange={setDaycareEnabled}
          />
        );
      case 6:
        return (
          <JobSettingsStep
            rights={rights}
            motherSettings={motherJobSettings}
            fatherSettings={fatherJobSettings}
            onMotherChange={setMotherJobSettings}
            onFatherChange={setFatherJobSettings}
          />
        );
      case 7:
        return (
          <EconomyStep
            rights={rights}
            coverage={coverage}
            motherEconomy={motherEconomy}
            fatherEconomy={fatherEconomy}
            onMotherChange={setMotherEconomy}
            onFatherChange={setFatherEconomy}
          />
        );
      case 8:
        return (
          <SummaryStep
            dueDate={dueDate}
            rights={rights}
            coverage={coverage}
            sharedWeeksToMother={sharedWeeksToMother}
            daycareDate={daycareStartDate}
            daycareEnabled={daycareEnabled}
            motherJobSettings={motherJobSettings}
            fatherJobSettings={fatherJobSettings}
            motherEconomy={motherEconomy}
            fatherEconomy={fatherEconomy}
            leaveResult={leaveResult}
            onGoBack={handleGoBackFromSummary}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_WIZARD_STEPS;

  // Step-specific validation hints
  const stepHints: Record<number, string> = {
    1: "Velg termindato for å gå videre",
    2: "Velg hvem som har rett til foreldrepenger",
    3: "Velg dekningsgrad",
  };

  // Step names for analytics
  const stepNames: Record<number, string> = {
    1: "due_date",
    2: "rights",
    3: "coverage",
    4: "distribution",
    5: "daycare",
    6: "job_settings",
    7: "economy",
    8: "summary",
  };

  // Track step completion and proceed
  const handleNextStep = () => {
    posthog.capture("wizard_step_completed", {
      step_number: currentStep,
      step_name: stepNames[currentStep],
    });
    nextStep();
  };

  // Show branded setup loader after wizard completion
  if (isSettingUp) {
    return <SetupLoader />;
  }

  // Show welcome intro for first-time users
  if (showIntro) {
    return (
      <div className="max-w-lg mx-auto">
        <WelcomeIntro onStart={() => setShowIntro(false)} />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Permisjonsplanlegger"
    >
      {/* Progress indicator — wider on desktop for 8 steps */}
      <div className="max-w-2xl mx-auto">
        <WizardProgress
          currentStep={currentStep}
          totalSteps={TOTAL_WIZARD_STEPS}
        />
      </div>

      {/* Step content — narrower for readability */}
      <div
        ref={stepContentRef}
        tabIndex={-1}
        className="max-w-lg mx-auto py-4 pb-32 outline-none scroll-pb-32"
        aria-live="polite"
      >
        <div
          key={currentStep}
          className={
            direction === "forward"
              ? "animate-slide-in-right"
              : "animate-slide-in-left"
          }
        >
          {renderStep()}
        </div>
      </div>

      {/* Navigation buttons — sticky bottom */}
      {!isLastStep && (
        <nav aria-label="Steg-navigasjon" className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
            {!canProceed && (
              <div
                className="flex items-center justify-center gap-2 px-3 py-2 bg-warning-bg border border-warning-fg/20 rounded-lg"
                role="alert"
                aria-atomic="true"
                aria-live="assertive"
              >
                <AlertCircle className="w-4 h-4 text-warning-fg shrink-0" aria-hidden="true" />
                <p className="text-sm text-warning-fg">
                  {stepHints[currentStep] ||
                    "Fyll ut informasjonen over for å fortsette"}
                </p>
              </div>
            )}
            {cameFromSummary && (
              <Button
                variant="secondary"
                onClick={handleReturnToSummary}
                className="w-full min-h-9 text-sm"
              >
                Tilbake til oppsummering
              </Button>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep}
                className="flex items-center gap-2 min-h-11"
              >
                <ChevronLeft className="w-4 h-4" />
                Tilbake
              </Button>

              <Button
                onClick={handleNextStep}
                disabled={!canProceed}
                className="flex items-center justify-center gap-2 min-h-11 flex-1"
              >
                Neste
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
