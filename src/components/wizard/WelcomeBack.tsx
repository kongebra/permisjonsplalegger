"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarHeart, ArrowRight, RotateCcw } from "lucide-react";

interface WelcomeBackProps {
  onContinue: () => void;
  onStartNew: () => void;
}

export function WelcomeBack({ onContinue, onStartNew }: WelcomeBackProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 animate-fade-in">
      <div className="max-w-lg w-full space-y-8">
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarHeart className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Velkommen tilbake!</h1>
            <p className="text-muted-foreground text-lg">
              Du har en lagret plan fra tidligere. Hva vil du gjøre?
            </p>
          </div>
        </div>

        {/* Choice cards */}
        <div className="grid gap-3">
          <button className="text-left w-full" onClick={onContinue}>
            <Card className="transition-colors hover:border-primary/50 cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Fortsett planen</h3>
                  <p className="text-sm text-muted-foreground">
                    Gå tilbake til der du slapp sist
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>

          <button className="text-left w-full" onClick={onStartNew}>
            <Card className="transition-colors hover:border-muted-foreground/30 cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Start på nytt</h3>
                  <p className="text-sm text-muted-foreground">
                    Slett alt og begynn fra begynnelsen
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground text-center">
          Dette er et planleggingsverktøy, ikke en offentlig tjeneste. Kontakt
          NAV for offisielle beregninger.
        </p>
      </div>
    </div>
  );
}
