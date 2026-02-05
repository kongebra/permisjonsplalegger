"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "./WizardProgress";
import { WelcomeIntro } from "./WelcomeIntro";
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
  usePersistence,
  useCanProceed,
} from "@/store/hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TOTAL_STEPS = 8;

export function WizardContainer() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);

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
  const { savePlan, hasSavedPlan } = usePersistence();

  // Skip intro if user has saved plan or is past step 1
  useEffect(() => {
    if (hasSavedPlan || currentStep > 1) {
      setShowIntro(false);
    }
  }, [hasSavedPlan, currentStep]);

  // Calculate leave result
  const leaveResult = useCalculatedLeave();

  // Check if we can proceed to next step
  const canProceed = useCanProceed();

  // Handle wizard completion
  const handleComplete = () => {
    completeWizard();
    savePlan();
    router.push("/planlegger/kalender");
  };

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
            onGoBack={setCurrentStep}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  // Show welcome intro for first-time users
  if (showIntro) {
    return (
      <div className="max-w-lg mx-auto">
        <WelcomeIntro onStart={() => setShowIntro(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress indicator */}
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Step content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      {/* Navigation buttons */}
      {!isLastStep && (
        <div className="space-y-3">
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbake
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceed}
              className="flex items-center gap-2"
            >
              Neste
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Help text when Next is disabled */}
          {!canProceed && (
            <p className="text-sm text-amber-600 text-center">
              Fyll ut informasjonen over for å fortsette
            </p>
          )}
        </div>
      )}
    </div>
  );
}
