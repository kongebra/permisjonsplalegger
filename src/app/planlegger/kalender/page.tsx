'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlannerStore } from '@/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function KalenderPage() {
  const router = useRouter();
  const { wizardCompleted, checkForSavedPlan, loadPlan } = usePlannerStore();

  useEffect(() => {
    // Check for saved plan on mount
    const hasSaved = checkForSavedPlan();

    // If no saved plan and wizard not completed, redirect to wizard
    if (!hasSaved && !wizardCompleted) {
      router.push('/planlegger');
    } else if (hasSaved && !wizardCompleted) {
      // Auto-load saved plan
      loadPlan();
    }
  }, [wizardCompleted, checkForSavedPlan, loadPlan, router]);

  // Placeholder - will be replaced with PlannerCalendar
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kalender</h1>
            <p className="text-sm text-muted-foreground">
              Interaktiv permisjonskalender
            </p>
          </div>
          <Link href="/planlegger">
            <Button variant="outline" size="sm">
              Tilbake til wizard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Kalender-komponenten kommer her...
          </p>
          <p className="text-sm text-muted-foreground">
            {wizardCompleted
              ? 'Wizard er fullført - klar for kalendervisning'
              : 'Fullfør wizard først for å se kalenderen'
            }
          </p>
        </div>
      </main>
    </div>
  );
}
