'use client';

import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EconomyComparison } from '@/components/results/EconomyComparison';
import { useEconomyComparison } from '@/store/hooks';
import { usePlannerStore } from '@/store';

export function PlannerEconomy() {
  const economyResult = useEconomyComparison();
  const setShowSettings = usePlannerStore((s) => s.setShowSettings);

  if (!economyResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Økonomisk sammenligning</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Legg inn lønnsinformasjon for å se forskjellen mellom 80% og 100% dekningsgrad.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Legg til lønn
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EconomyComparison result={economyResult} />
    </div>
  );
}
