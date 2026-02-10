'use client';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EconomyComparison } from '@/components/results/EconomyComparison';
import { useEconomyComparison, useWizard, usePeriods } from '@/store/hooks';
import { usePlannerStore } from '@/store';
import { LEAVE_CONFIG } from '@/lib/constants';
import { GlossaryTerm } from '@/components/ui/glossary-term';
import { cn } from '@/lib/utils';
import { MonthlyIncomeOverview } from './MonthlyIncomeOverview';
import { CumulativeLiquidityChart } from './CumulativeLiquidityChart';

function daysToWeeks(days: number) {
  return Math.ceil(days / 7);
}

function QuotaOverview() {
  const { coverage, rights } = useWizard();
  const { periods } = usePeriods();
  const config = LEAVE_CONFIG[coverage];

  const quotas = useMemo(() => {
    const result: { label: string; used: number; total: number; color: string; sharedMother?: number; sharedFather?: number }[] = [];
    const permisjonPeriods = periods.filter((p) => p.type === 'permisjon');

    let motherQuotaWeeks = 0;
    let fatherQuotaWeeks = 0;
    let sharedWeeksMother = 0;
    let sharedWeeksFather = 0;

    for (const p of permisjonPeriods) {
      const weeks = daysToWeeks(differenceInDays(p.endDate, p.startDate));

      if (p.segmentType === 'quota' || p.segmentType === 'preBirth' || p.segmentType === 'mandatory') {
        if (p.parent === 'mother') motherQuotaWeeks += weeks;
        else fatherQuotaWeeks += weeks;
      } else if (p.segmentType === 'shared' || p.segmentType === 'overlap' || !p.segmentType) {
        if (p.parent === 'mother') sharedWeeksMother += weeks;
        else sharedWeeksFather += weeks;
      }
    }

    if (rights !== 'father-only') {
      result.push({
        label: 'Mors kvote',
        used: Math.min(motherQuotaWeeks, config.mother),
        total: config.mother,
        color: 'bg-mother-strong',
      });
    }

    if (rights !== 'mother-only') {
      result.push({
        label: 'Fars kvote',
        used: Math.min(fatherQuotaWeeks, config.father),
        total: config.father,
        color: 'bg-father-strong',
      });
    }

    if (rights === 'both') {
      result.push({
        label: 'Fellesperiode',
        used: Math.min(sharedWeeksMother + sharedWeeksFather, config.shared),
        total: config.shared,
        color: 'bg-shared',
        sharedMother: sharedWeeksMother,
        sharedFather: sharedWeeksFather,
      });
    }

    return result;
  }, [rights, periods, config]);

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Kvoteoversikt</h3>
      {quotas.map((quota) => (
        <div key={quota.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {quota.label === 'Mors kvote' && <>Mors <GlossaryTerm term="kvote">kvote</GlossaryTerm></>}
              {quota.label === 'Fars kvote' && <>Fars <GlossaryTerm term="kvote">kvote</GlossaryTerm></>}
              {quota.label === 'Fellesperiode' && <GlossaryTerm term="fellesperiode">Fellesperiode</GlossaryTerm>}
            </span>
            <span className="font-medium">
              {quota.sharedMother !== undefined
                ? `Mor ${quota.sharedMother} + Far ${quota.sharedFather} / ${quota.total} uker`
                : `${quota.used}/${quota.total} uker`}
            </span>
          </div>
          {quota.sharedMother !== undefined ? (
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              <div
                className="h-full bg-mother-strong transition-all"
                style={{ width: `${Math.min(100, (quota.sharedMother / quota.total) * 100)}%` }}
              />
              <div
                className="h-full bg-father-strong transition-all"
                style={{ width: `${Math.min(100 - (quota.sharedMother / quota.total) * 100, (quota.sharedFather! / quota.total) * 100)}%` }}
              />
            </div>
          ) : (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', quota.color)}
                style={{ width: `${Math.min(100, (quota.used / quota.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PlannerEconomy() {
  const economyResult = useEconomyComparison();
  const setShowSettings = usePlannerStore((s) => s.setShowSettings);

  return (
    <div className="space-y-4">
      <QuotaOverview />

      <MonthlyIncomeOverview />

      <CumulativeLiquidityChart />

      {!economyResult ? (
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
      ) : (
        <EconomyComparison result={economyResult} />
      )}
    </div>
  );
}
