'use client';

import { useMemo } from 'react';
import { useWizard, usePeriods, useEconomy, useCalculatedLeave } from '@/store/hooks';
import { hasEconomyInput } from '@/lib/calculator/economy';
import { calculatePlannerMonthlyIncome, getPlannerNormalIncome } from '@/lib/calculator/planner-income';
import { cn } from '@/lib/utils';

export function MonthlyIncomeOverview() {
  const { coverage, rights, daycareStartDate, daycareEnabled, monthlyBudgetLimit } = useWizard();
  const { periods } = usePeriods();
  const { motherEconomy, fatherEconomy } = useEconomy();
  const leaveResult = useCalculatedLeave();

  const hasSalary = hasEconomyInput(rights, motherEconomy, fatherEconomy);
  const hasLeavePeriods = periods.some(p => p.type === 'permisjon');

  const monthlyData = useMemo(() => {
    if (!hasSalary || !hasLeavePeriods) return [];
    return calculatePlannerMonthlyIncome({
      periods,
      rights,
      coverage,
      motherEconomy,
      fatherEconomy,
      gap: leaveResult.gap,
      daycareStartDate: daycareEnabled ? daycareStartDate : null,
    });
  }, [hasSalary, hasLeavePeriods, periods, leaveResult.gap, daycareEnabled, daycareStartDate, motherEconomy, fatherEconomy, coverage, rights]);

  if (!hasSalary || monthlyData.length === 0) return null;

  const normalIncome = getPlannerNormalIncome(rights, motherEconomy, fatherEconomy);
  // Ferie over permisjon kan gi mer enn vanlig lønn, så stolpene skaleres mot største måned
  const barScale = Math.max(normalIncome, ...monthlyData.map((m) => m.total));
  // Strek for vanlig lønn når stolpene er skalert, slik at tomrom ikke ser ut som tap
  const normalMarker = barScale > normalIncome && normalIncome > 0 ? (normalIncome / barScale) * 100 : null;

  const formatKr = (n: number) => Math.round(n).toLocaleString('nb-NO');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Månedlig inntekt</h3>
        <span className="text-xs text-muted-foreground">
          Normal: {formatKr(normalIncome)} kr/mnd
        </span>
      </div>

      <ul className="space-y-1.5">
        {monthlyData.map((m) => {
          // Diff vs normalt
          const diff = m.total - normalIncome;
          const diffLabel = diff >= 0 ? `+${formatKr(diff)}` : formatKr(diff);
          const diffColor = diff >= 0 ? 'text-success-fg' : 'text-warning-fg';

          // Budsjettindikator på beløpet
          const indicatorColor =
            monthlyBudgetLimit > 0
              ? m.total < monthlyBudgetLimit
                ? 'text-destructive'
                : m.total < monthlyBudgetLimit * 1.1
                  ? 'text-warning-fg'
                  : 'text-success-fg'
              : '';

          return (
            <li key={m.month.toISOString()} className="flex items-center gap-2">
              {/* Månedsnavn + ferie-ikon i fast bredde, slik at stolpene starter likt på alle rader */}
              <div className="w-[4.5rem] shrink-0 flex items-center justify-between">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {m.month.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' })}
                </span>
                {m.hasVacation && (
                  <span className="text-xs" role="img" aria-label="Feriemåned">☀️</span>
                )}
              </div>

              {/* Stolpediagram. Skjermlesere får fordelingen som tekst i stedet. */}
              <span className="sr-only">
                Foreldrepenger {formatKr(m.navIncome)} kr, lønn og feriepenger {formatKr(m.employerIncome)} kr.
              </span>
              <div className="relative flex-1 h-3 bg-muted rounded-sm overflow-hidden flex" aria-hidden="true">
                {m.navIncome > 0 && barScale > 0 && (
                  <div
                    className="h-full bg-chart-1"
                    style={{ width: `${(m.navIncome / barScale) * 100}%` }}
                  />
                )}
                {m.employerIncome > 0 && barScale > 0 && (
                  <div
                    className="h-full bg-chart-2"
                    style={{ width: `${(m.employerIncome / barScale) * 100}%` }}
                  />
                )}
                {normalMarker !== null && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/50"
                    style={{ left: `${normalMarker}%` }}
                  />
                )}
              </div>

              {/* Beløp + diff i fast bredde, slik at stolpene slutter likt på alle rader */}
              <div className="w-20 text-right shrink-0">
                <div className={cn('text-xs font-medium tabular-nums', indicatorColor)}>
                  {formatKr(m.total)} kr
                </div>
                <div className={cn('text-[10px] tabular-nums', diffColor)}>
                  {diffLabel}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Forklaring */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-chart-1" />
          <span>Foreldrepenger</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-chart-2" />
          <span>Lønn og feriepenger</span>
        </div>
        {normalMarker !== null && (
          <div className="flex items-center gap-1">
            <span className="w-0.5 h-2.5 bg-foreground/50" />
            <span>Vanlig lønn</span>
          </div>
        )}
      </div>

      {/* Budsjettgrense-hjelp */}
      {monthlyBudgetLimit > 0 && (
        <p className="text-xs text-muted-foreground">
          Minstegrense: <span className="font-medium">{formatKr(monthlyBudgetLimit)} kr/mnd</span>
        </p>
      )}
    </div>
  );
}
