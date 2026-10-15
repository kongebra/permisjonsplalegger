"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import posthog from "posthog-js";

interface WelcomeIntroProps {
  onStart: () => void;
}

export function WelcomeIntro({ onStart }: WelcomeIntroProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold mb-3" role="heading" aria-level={2}>
          Velkommen til permisjonsplanleggeren
        </p>
        <p className="text-muted-foreground text-lg">
          Tar ca 5 minutter. Fremgangen lagres automatisk.
        </p>
      </div>

      <div className="rounded-lg bg-warning-bg border border-warning-fg/20 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-warning-fg shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-warning-fg">
            <p className="font-semibold text-foreground text-sm">
              Viktig å vite
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Ikke en offentlig tjeneste — laget av privatpersoner</li>
              <li>Estimater kan inneholde feil</li>
              <li>Sjekk alltid med NAV for rettigheter og beløp</li>
              <li>Regler og satser kan endre seg</li>
            </ul>
            <p className="text-warning-fg">
              Ved å bruke kalkulatoren godtar du at den kun er ment som et
              hjelpemiddel.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => {
          posthog.capture("wizard_started");
          onStart();
        }}
        size="lg"
        className="w-full min-h-[48px] text-base"
      >
        Start planleggingen
      </Button>
    </div>
  );
}
