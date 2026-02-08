"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, Calculator, AlertTriangle } from "lucide-react";
import posthog from "posthog-js";

interface WelcomeIntroProps {
  onStart: () => void;
}

export function WelcomeIntro({ onStart }: WelcomeIntroProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3">
          Velkommen til permisjonsplanleggeren
        </h1>
        <p className="text-muted-foreground text-lg">
          Planlegg foreldrepermisjonen og forstå økonomien.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-green-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Trygt og privat</h3>
              <p className="text-sm text-muted-foreground">
                Personlig informasjon lagres kun lokalt. Anonym bruksstatistikk
                samles inn for å forbedre tjenesten.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4">
            <Clock className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Tar ca 5 minutter</h3>
              <p className="text-sm text-muted-foreground">
                Kan lukkes når som helst. Fremgangen lagres automatisk.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4">
            <Calculator className="w-8 h-8 text-purple-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Se hva familien faktisk får</h3>
              <p className="text-sm text-muted-foreground">
                Sammenlign 80% og 100% dekning og finn ut hva som lønner seg.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-amber-800">
            <p className="font-semibold text-amber-900 text-sm">
              Viktig å vite
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Ikke en offentlig tjeneste — laget av privatpersoner</li>
              <li>Estimater kan inneholde feil</li>
              <li>Sjekk alltid med NAV for rettigheter og beløp</li>
              <li>Regler og satser kan endre seg</li>
            </ul>
            <p className="text-amber-700">
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
