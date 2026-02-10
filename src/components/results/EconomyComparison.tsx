'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EconomyResult } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

interface EconomyComparisonProps {
  result: EconomyResult;
}

export function EconomyComparison({ result }: EconomyComparisonProps) {
  const { scenario80, scenario100, difference, recommendation } = result;
  const best = difference >= 0 ? '100%' : '80%';
  const absDiff = Math.abs(difference);

  return (
    <div className="space-y-6">
      {/* Det store tallet */}
      <Card
        className={`${
          absDiff <= 10000
            ? 'border-muted bg-muted/30'
            : 'border-warning-fg bg-warning-bg'
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {absDiff <= 10000
              ? 'Liten forskjell mellom 80% og 100%'
              : `${best} dekning gir mest utbetalt`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-4xl font-bold ${
              absDiff <= 10000
                ? 'text-muted-foreground'
                : 'text-warning-fg'
            }`}
          >
            {formatCurrency(absDiff)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            mer med {best} dekning
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{recommendation}</p>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 100% scenario */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">100% dekning (49 uker)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>NAV-utbetaling</span>
              <span className="text-success-fg">
                +{formatCurrency(scenario100.breakdown.navPayout)}
              </span>
            </div>
            {scenario100.breakdown.commissionLoss > 0 && (
              <div className="flex justify-between">
                <span>Provisjonstap</span>
                <span className="text-destructive">
                  -{formatCurrency(scenario100.breakdown.commissionLoss)}
                </span>
              </div>
            )}
            {scenario100.breakdown.gapCost > 0 && (
              <div className="flex justify-between">
                <span>
                  Udekket gap
                  <span className="text-muted-foreground text-xs"> (tapt inntekt)</span>
                </span>
                <span className="text-destructive">
                  -{formatCurrency(scenario100.breakdown.gapCost)}
                </span>
              </div>
            )}
            {scenario100.breakdown.feriepengeDifference > 0 && (
              <div className="flex justify-between">
                <span>Tapt feriepengeopptjening</span>
                <span className="text-destructive">
                  -{formatCurrency(scenario100.breakdown.feriepengeDifference)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Totalt</span>
              <span>{formatCurrency(scenario100.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 80% scenario */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">80% dekning (59 uker)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>NAV-utbetaling</span>
              <span className="text-success-fg">
                +{formatCurrency(scenario80.breakdown.navPayout)}
              </span>
            </div>
            {scenario80.breakdown.commissionLoss > 0 && (
              <div className="flex justify-between">
                <span>Provisjonstap</span>
                <span className="text-destructive">
                  -{formatCurrency(scenario80.breakdown.commissionLoss)}
                </span>
              </div>
            )}
            {scenario80.breakdown.gapCost > 0 && (
              <div className="flex justify-between">
                <span>
                  Udekket gap
                  <span className="text-muted-foreground text-xs"> (tapt inntekt)</span>
                </span>
                <span className="text-destructive">
                  -{formatCurrency(scenario80.breakdown.gapCost)}
                </span>
              </div>
            )}
            {scenario80.breakdown.feriepengeDifference > 0 && (
              <div className="flex justify-between">
                <span>Tapt feriepengeopptjening</span>
                <span className="text-destructive">
                  -{formatCurrency(scenario80.breakdown.feriepengeDifference)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Totalt</span>
              <span>{formatCurrency(scenario80.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fotnoter */}
      <div className="space-y-1">
        {(scenario100.breakdown.gapCost > 0 || scenario80.breakdown.gapCost > 0) && (
          <p className="text-xs text-muted-foreground">
            Gap-kostnaden antar at én forelder er hjemme uten lønn i hele gapet.
            I praksis kan ferie, fleksibel jobb eller annen hjelp redusere dette.
          </p>
        )}
        {(scenario100.breakdown.feriepengeDifference > 0 || scenario80.breakdown.feriepengeDifference > 0) && (
          <p className="text-xs text-muted-foreground">
            Tapt feriepengeopptjening vises i juni-lønnen året etter — NAV dekker kun
            opptjening for de første 12–15 ukene av permisjonen.
          </p>
        )}
      </div>
    </div>
  );
}
