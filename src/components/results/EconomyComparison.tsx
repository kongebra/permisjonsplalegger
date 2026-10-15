'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Coverage, EconomyResult, GapInfo, ParentRights, ScenarioResult } from '@/lib/types';
import { FERIEPENGER_NAV_WEEKS } from '@/lib/constants';
import { getTotalLeaveWeeks } from '@/lib/calculator';
import { getCoverageVerdict } from '@/lib/calculator/economy';
import { formatCurrency, formatWorkdays } from '@/lib/format';

interface EconomyComparisonProps {
  result: EconomyResult;
  rights: ParentRights;
}

function ScenarioCard({
  coverage,
  scenario,
  gap,
  rights,
}: {
  coverage: Coverage;
  scenario: ScenarioResult;
  gap: GapInfo;
  rights: ParentRights;
}) {
  const { breakdown } = scenario;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {coverage}% dekning ({getTotalLeaveWeeks(coverage, rights)} uker)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span>NAV-utbetaling</span>
          <span className="text-success-fg">+{formatCurrency(breakdown.navPayout)}</span>
        </div>
        {breakdown.salaryIncome > 0 && (
          <div className="flex justify-between gap-2">
            <span>Lønn utenfor permisjon</span>
            <span className="text-success-fg">+{formatCurrency(breakdown.salaryIncome)}</span>
          </div>
        )}
        {breakdown.gapCost > 0 && (
          <div className="flex justify-between gap-2">
            <span>
              Udekket gap
              <span className="text-muted-foreground text-xs"> ({formatWorkdays(gap.workDays)} uten lønn)</span>
            </span>
            <span className="text-destructive">-{formatCurrency(breakdown.gapCost)}</span>
          </div>
        )}
        {breakdown.commissionLoss > 0 && (
          <div className="flex justify-between gap-2">
            <span>Provisjonstap</span>
            <span className="text-destructive">-{formatCurrency(breakdown.commissionLoss)}</span>
          </div>
        )}
        {breakdown.feriepengeDifference > 0 && (
          <div className="flex justify-between gap-2">
            <span>Tapt feriepengeopptjening</span>
            <span className="text-destructive">-{formatCurrency(breakdown.feriepengeDifference)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2 border-t pt-2 font-medium">
          <span>Totalt</span>
          <span>{formatCurrency(scenario.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function EconomyComparison({ result, rights }: EconomyComparisonProps) {
  const { scenario80, scenario100, difference, recommendation } = result;
  // Samme vinner og samme tall som grafen og oppsummeringen
  const { winner, amount, isSmall } = getCoverageVerdict(difference);

  return (
    <div className="space-y-6">
      {/* Det store tallet */}
      <Card
        className={`${
          isSmall
            ? 'border-muted bg-muted/30'
            : 'border-warning-fg bg-warning-bg'
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {isSmall || !winner
              ? 'Liten forskjell mellom 80% og 100%'
              : `${winner}% dekning gir mest utbetalt`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-4xl font-bold ${
              isSmall
                ? 'text-muted-foreground'
                : 'text-warning-fg'
            }`}
          >
            {formatCurrency(amount)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {winner ? `mer med ${winner}% dekning` : 'samme sum med begge'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{recommendation}</p>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <ScenarioCard coverage={100} scenario={scenario100} gap={result.gap100} rights={rights} />
        <ScenarioCard coverage={80} scenario={scenario80} gap={result.gap80} rights={rights} />
      </div>

      {/* Fotnoter */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Begge alternativene er regnet over samme tidsrom, fra første permisjonsdag til barnehagestart
          (eller til siste permisjonsdag hvis den kommer senere), så totalene kan sammenlignes direkte. Lønn utenfor permisjon er lønn for arbeidsdager når forelderen ikke har
          permisjon.
        </p>
        {(scenario100.breakdown.gapCost > 0 || scenario80.breakdown.gapCost > 0) && (
          <p className="text-xs text-muted-foreground">
            Gap-kostnaden antar at én forelder er hjemme uten lønn i hele gapet.
            I praksis kan ferie, fleksibel jobb eller annen hjelp redusere dette.
          </p>
        )}
        {(scenario100.breakdown.feriepengeDifference > 0 || scenario80.breakdown.feriepengeDifference > 0) && (
          <p className="text-xs text-muted-foreground">
            Tapt feriepengeopptjening vises i juni-lønnen året etter - NAV dekker kun
            opptjening for de første {FERIEPENGER_NAV_WEEKS[100]} ukene (100%) eller {FERIEPENGER_NAV_WEEKS[80]} ukene (80%) av permisjonen,
            og ulønnet permisjon i gapet gir ingen opptjening.
          </p>
        )}
      </div>
    </div>
  );
}
