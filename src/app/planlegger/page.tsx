'use client';

import { useEffect } from 'react';
import { usePlannerStore } from '@/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PlanleggerPage() {
  const { checkForSavedPlan, hasSavedPlan, loadPlan, wizardCompleted } = usePlannerStore();

  useEffect(() => {
    checkForSavedPlan();
  }, [checkForSavedPlan]);

  // Placeholder - will be replaced with WizardContainer
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Permisjonsplanlegger</h1>
          <p className="text-muted-foreground">
            Planlegg foreldrepermisjonen steg for steg
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {hasSavedPlan && !wizardCompleted && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium mb-2">Fortsett der du slapp?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Du har en lagret plan fra tidligere.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => loadPlan()}>
                  Fortsett
                </Button>
                <Button variant="outline">
                  Start på nytt
                </Button>
              </div>
            </div>
          )}

          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Wizard-komponenten kommer her...
            </p>
            <Link href="/gammel">
              <Button variant="outline">
                Bruk gammel kalkulator
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
