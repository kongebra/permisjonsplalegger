'use client';

import { useMemo } from 'react';
import { startOfMonth, addMonths, addDays, getDaysInMonth, isAfter } from 'date-fns';
import { useWizard, usePeriods, useEconomy, useCalculatedLeave } from '@/store/hooks';
import { calculateBasis } from '@/lib/calculator/economy';
import { cn } from '@/lib/utils';
import type { CustomPeriod, Parent, Coverage, ParentEconomy } from '@/lib/types';

interface ParentMonthResult {
  navIncome: number;
  salaryIncome: number;
  total: number;
}

interface MonthData {
  month: Date;
  totalNav: number;
  totalSalary: number;
  total: number;
}

function calcParentMonth(
  monthStart: Date,
  daysInMonth: number,
  parent: Parent,
  periods: CustomPeriod[],
  economy: ParentEconomy,
  coverage: Coverage,
  gapStart: Date,
  gapEnd: Date,
  isGapParent: boolean,
): ParentMonthResult {
  if (economy.monthlySalary <= 0) {
    return { navIncome: 0, salaryIncome: 0, total: 0 };
  }

  const basis = calculateBasis(economy.monthlySalary, economy.employerCoversAbove6G);
  const coverageRate = coverage === 80 ? 0.8 : 1.0;
  const monthlyNav = (basis * coverageRate) / 12;
  const monthlySalary = economy.monthlySalary;

  let navDays = 0;
  let salaryDays = 0;

  const parentPeriods = periods.filter(p => p.parent === parent);

  for (let d = 0; d < daysInMonth; d++) {
    const day = addDays(monthStart, d);
    const period = parentPeriods.find(p => day >= p.startDate && day < p.endDate);

    if (period) {
      if (period.type === 'permisjon') navDays++;
      else if (period.type === 'ferie') salaryDays++;
      // ulonnet/annet → ulønnet, telles ikke
    } else if (isGapParent && day >= gapStart && day < gapEnd) {
      // I gap hjemme uten betaling
    } else {
      salaryDays++;
    }
  }

  const navIncome = Math.round((navDays / daysInMonth) * monthlyNav);
  const salaryIncome = Math.round((salaryDays / daysInMonth) * monthlySalary);

  return { navIncome, salaryIncome, total: navIncome + salaryIncome };
}

export function MonthlyIncomeOverview() {
  const { coverage, rights, daycareStartDate, daycareEnabled, monthlyBudgetLimit } = useWizard();
  const { periods } = usePeriods();
  const { motherEconomy, fatherEconomy } = useEconomy();
  const leaveResult = useCalculatedLeave();

  const hasSalary = motherEconomy.monthlySalary > 0 || fatherEconomy.monthlySalary > 0;
  const hasLeavePeriods = periods.some(p => p.type === 'permisjon');

  // Bestemmer hvem som er hjemme i gapet (lavest lønn, samme logikk som calculateGapCost)
  const gapParent = useMemo((): Parent => {
    if (rights === 'mother-only') return 'mother';
    if (rights === 'father-only') return 'father';
    return motherEconomy.monthlySalary <= fatherEconomy.monthlySalary ? 'mother' : 'father';
  }, [rights, motherEconomy.monthlySalary, fatherEconomy.monthlySalary]);

  const monthlyData = useMemo((): MonthData[] => {
    if (!hasSalary || !hasLeavePeriods) return [];

    const periodStarts = periods.map(p => p.startDate.getTime());
    const periodEnds = periods.map(p => p.endDate.getTime());
    const firstStart = new Date(Math.min(...periodStarts));
    const lastEnd = new Date(Math.max(...periodEnds));

    const rangeStart = startOfMonth(firstStart);
    const rangeEnd = daycareEnabled && daycareStartDate && daycareStartDate > lastEnd
      ? startOfMonth(daycareStartDate)
      : startOfMonth(lastEnd);

    const { start: gapStart, end: gapEnd } = leaveResult.gap;

    const months: MonthData[] = [];
    let current = rangeStart;

    while (!isAfter(current, rangeEnd)) {
      const dim = getDaysInMonth(current);

      const mother = rights !== 'father-only'
        ? calcParentMonth(current, dim, 'mother', periods, motherEconomy, coverage, gapStart, gapEnd, gapParent === 'mother')
        : { navIncome: 0, salaryIncome: 0, total: 0 };

      const father = rights !== 'mother-only'
        ? calcParentMonth(current, dim, 'father', periods, fatherEconomy, coverage, gapStart, gapEnd, gapParent === 'father')
        : { navIncome: 0, salaryIncome: 0, total: 0 };

      months.push({
        month: current,
        totalNav: mother.navIncome + father.navIncome,
        totalSalary: mother.salaryIncome + father.salaryIncome,
        total: mother.total + father.total,
      });

      current = addMonths(current, 1);
    }

    return months;
  }, [hasSalary, hasLeavePeriods, periods, leaveResult.gap, daycareEnabled, daycareStartDate, motherEconomy, fatherEconomy, coverage, rights, gapParent]);

  if (!hasSalary || monthlyData.length === 0) return null;

  const normalIncome =
    (rights !== 'father-only' ? motherEconomy.monthlySalary : 0) +
    (rights !== 'mother-only' ? fatherEconomy.monthlySalary : 0);

  const formatKr = (n: number) => Math.round(n).toLocaleString('nb-NO');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Månedlig inntekt</h3>
        <span className="text-xs text-muted-foreground">
          Normal: {formatKr(normalIncome)} kr/mnd
        </span>
      </div>

      <div className="space-y-1.5">
        {monthlyData.map((m) => {
          // Diff vs normalt
          const diff = m.total - normalIncome;
          const diffLabel = diff >= 0 ? `+${formatKr(diff)}` : formatKr(diff);
          const diffColor = diff >= 0 ? 'text-success-fg' : 'text-warning-fg';

          // Feriemåned-markering: noen 'ferie'-perioder overlapper denne måneden?
          const monthEnd = addMonths(m.month, 1);
          const hasFerie = periods.some(
            p => p.type === 'ferie' && p.startDate < monthEnd && p.endDate > m.month,
          );

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
            <div key={m.month.toISOString()} className="flex items-center gap-2">
              {/* Månedsnavn */}
              <span className="w-14 text-xs text-muted-foreground shrink-0 tabular-nums">
                {m.month.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' })}
              </span>

              {/* Ferie-ikon */}
              {hasFerie && (
                <span className="text-xs" aria-label="Feriemåned">☀️</span>
              )}

              {/* Stolpediagram */}
              <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden flex">
                {m.totalNav > 0 && normalIncome > 0 && (
                  <div
                    className="h-full bg-chart-1"
                    style={{ width: `${(m.totalNav / normalIncome) * 100}%` }}
                  />
                )}
                {m.totalSalary > 0 && normalIncome > 0 && (
                  <div
                    className="h-full bg-chart-2"
                    style={{ width: `${(m.totalSalary / normalIncome) * 100}%` }}
                  />
                )}
              </div>

              {/* Beløp + diff */}
              <div className="text-right shrink-0">
                <div className={cn('text-xs font-medium tabular-nums', indicatorColor)}>
                  {formatKr(m.total)} kr
                </div>
                <div className={cn('text-[10px] tabular-nums', diffColor)}>
                  {diffLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forklaring */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-chart-1" />
          <span>Foreldrepenger</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-chart-2" />
          <span>Lønn</span>
        </div>
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
