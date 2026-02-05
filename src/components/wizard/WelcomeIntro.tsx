'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Calculator } from 'lucide-react';

interface WelcomeIntroProps {
  onStart: () => void;
}

export function WelcomeIntro({ onStart }: WelcomeIntroProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3">Velkommen til permisjonsplanleggeren</h1>
        <p className="text-muted-foreground text-lg">
          Vi hjelper deg a planlegge foreldrepermisjonen og forsta okonomien.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Shield className="w-8 h-8 text-green-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Trygt og privat</h3>
              <p className="text-sm text-muted-foreground">
                All informasjon lagres kun pa din enhet. Vi sender ingen data til servere.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Clock className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Tar ca 5 minutter</h3>
              <p className="text-sm text-muted-foreground">
                Du kan nar som helst lukke og fortsette senere. Fremgangen lagres automatisk.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Calculator className="w-8 h-8 text-purple-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Se hva du faktisk far</h3>
              <p className="text-sm text-muted-foreground">
                Sammenlign 80% og 100% dekning og finn ut hva som lonner seg for din situasjon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onStart} size="lg" className="w-full">
        Start planleggingen
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Dette er et planleggingsverktoy. Ha med tallene til samtale med NAV eller arbeidsgiver.
      </p>
    </div>
  );
}
