'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LEAVE_CONFIG } from '@/lib/constants';
import { compareScenarios } from '@/lib/calculator/economy';
import { calculateLeave } from '@/lib/calculator';
import { formatCurrency } from '@/lib/format';
import type { Coverage, ParentRights, JobSettings, LeaveResult, ParentEconomy, EconomyResult } from '@/lib/types';
import { format, differenceInWeeks } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarDays, Users, Percent, Baby, Briefcase, AlertCircle, ChevronRight, ChevronDown, Wallet, Lightbulb, ArrowRight } from 'lucide-react';
import posthog from 'posthog-js';

interface SummaryStepProps {
  dueDate: Date;
  rights: ParentRights;
  coverage: Coverage;
  sharedWeeksToMother: number;
  daycareDate: Date | null;
  daycareEnabled: boolean;
  motherJobSettings: JobSettings | null;
  fatherJobSettings: JobSettings | null;
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
  leaveResult: LeaveResult;
  onGoBack: (step: number) => void;
  onComplete: () => void;
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  step: number;
  onEdit: (step: number) => void;
}

function ExplanationPanel({ result, gap80Weeks, gap100Weeks, motherVacationDays, fatherVacationDays }: {
  result: EconomyResult;
  gap80Weeks: number;
  gap100Weeks: number;
  motherVacationDays: number;
  fatherVacationDays: number;
}) {
  const { scenario80, scenario100, difference } = result;
  const favors100 = difference > 0;

  // Build short explanation based on which scenario wins and why
  const getExplanation = () => {
    if (Math.abs(difference) <= 5000) {
      return 'Forskjellen er liten. Valget handler mer om hvor lang permisjon familien ønsker.';
    }
    if (favors100) {
      if (gap100Weeks > gap80Weeks) {
        return `100% gir full lønn i 49 uker. Selv om gapet er lengre (${gap100Weeks} vs ${gap80Weeks} uker), veier den høyere NAV-utbetalingen opp.`;
      }
      return '100% gir full lønn i 49 uker, noe som gir høyere total utbetaling enn 80% over 59 uker.';
    }
    return `80% gir permisjon i 59 uker — 10 uker mer enn 100%. Det gir et kortere gap (${gap80Weeks} vs ${gap100Weeks} uker) og lavere totalkostnad.`;
  };

  // Only show factors that actually differ meaningfully (> 500 kr)
  const factors: { label: string; val80: number; val100: number; isLoss: boolean }[] = [];

  if (Math.abs(scenario100.breakdown.navPayout - scenario80.breakdown.navPayout) > 500) {
    factors.push({
      label: 'NAV-utbetaling',
      val80: scenario80.breakdown.navPayout,
      val100: scenario100.breakdown.navPayout,
      isLoss: false,
    });
  }
  if (scenario80.breakdown.gapCost > 0 || scenario100.breakdown.gapCost > 0) {
    factors.push({
      label: 'Gap-kostnad',
      val80: scenario80.breakdown.gapCost,
      val100: scenario100.breakdown.gapCost,
      isLoss: true,
    });
  }
  if (scenario80.breakdown.feriepengeDifference > 0 || scenario100.breakdown.feriepengeDifference > 0) {
    factors.push({
      label: 'Tapt feriepenger',
      val80: scenario80.breakdown.feriepengeDifference,
      val100: scenario100.breakdown.feriepengeDifference,
      isLoss: true,
    });
  }
  if (scenario80.breakdown.commissionLoss > 0 || scenario100.breakdown.commissionLoss > 0) {
    factors.push({
      label: 'Provisjonstap',
      val80: scenario80.breakdown.commissionLoss,
      val100: scenario100.breakdown.commissionLoss,
      isLoss: true,
    });
  }

  return (
    <div className="space-y-3 pt-2 border-t border-[var(--color-info-fg)]/15">
      <p className="text-xs text-[var(--color-info-fg)]">
        {getExplanation()}
      </p>

      {/* Factor table */}
      {factors.length > 0 && (
        <div className="rounded-md bg-background/60 text-xs">
          {/* Header */}
          <div className="grid grid-cols-3 gap-1 px-2 py-1.5 text-muted-foreground font-medium border-b">
            <span />
            <span className="text-right">80%</span>
            <span className="text-right">100%</span>
          </div>
          {/* Rows */}
          {factors.map((f) => (
            <div key={f.label} className="grid grid-cols-3 gap-1 px-2 py-1.5 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="text-right tabular-nums">
                {f.isLoss && f.val80 > 0 ? '−' : ''}{formatCurrency(f.val80)}
              </span>
              <span className="text-right tabular-nums">
                {f.isLoss && f.val100 > 0 ? '−' : ''}{formatCurrency(f.val100)}
              </span>
            </div>
          ))}
          {/* Net total */}
          <div className="grid grid-cols-3 gap-1 px-2 py-1.5 font-semibold bg-muted/30 rounded-b-md">
            <span>Netto</span>
            <span className="text-right tabular-nums">{formatCurrency(scenario80.total)}</span>
            <span className="text-right tabular-nums">{formatCurrency(scenario100.total)}</span>
          </div>
        </div>
      )}

      {/* Gap-anbefaling */}
      {(() => {
        // Use the gap from the winning scenario (or 100% as default)
        const gapWeeks = favors100 ? gap100Weeks : gap80Weeks;
        if (gapWeeks <= 0) return null;

        // Convert vacation days to weeks (5 workdays = 1 week)
        const totalVacationWeeks = Math.floor((motherVacationDays + fatherVacationDays) / 5);
        const bothParentsHaveVacation = motherVacationDays > 0 && fatherVacationDays > 0;
        const gapTakenBy = result.scenario100.breakdown.gapTakenBy;

        let recommendation: string;

        if (totalVacationWeeks >= gapWeeks) {
          // Vacation can cover the entire gap
          if (gapWeeks <= 4) {
            recommendation = `Gapet er på ${gapWeeks} ${gapWeeks === 1 ? 'uke' : 'uker'} — dette kan dekkes med ferie. Planlegg feriedagene i kalenderen.`;
          } else if (bothParentsHaveVacation) {
            recommendation = `Gapet er på ${gapWeeks} uker. Fordel ferien mellom begge foreldre (ikke ta den samtidig) for å dekke hele perioden.`;
          } else {
            recommendation = `Gapet er på ${gapWeeks} uker — dette kan dekkes med ferie. Planlegg feriedagene i kalenderen.`;
          }
        } else if (totalVacationWeeks > 0) {
          // Vacation covers some, but not all
          const unpaidWeeks = gapWeeks - totalVacationWeeks;
          const unpaidLabel = `${unpaidWeeks} ${unpaidWeeks === 1 ? 'uke' : 'uker'}`;
          if (gapTakenBy) {
            const lowestEarner = gapTakenBy === 'mother' ? 'Mor' : 'Far';
            recommendation = `Gapet er på ${gapWeeks} uker. Bruk ferie til å dekke ${totalVacationWeeks} uker, og la ${lowestEarner} (lavest dagsats) ta ${unpaidLabel} ulønnet permisjon.`;
          } else {
            recommendation = `Gapet er på ${gapWeeks} uker. Bruk ferie til å dekke ${totalVacationWeeks} uker. De resterende ${unpaidLabel} må dekkes med ulønnet permisjon.`;
          }
        } else if (gapTakenBy) {
          // No vacation data — recommend based on lowest earner
          const lowestEarner = gapTakenBy === 'mother' ? 'Mor' : 'Far';
          recommendation = `${lowestEarner} bør ta den ubetalte perioden (lavest dagsats = minst tapt inntekt). Vurder å bruke feriedager for å dekke deler av gapet.`;
        } else {
          // No vacation data, no earner comparison
          recommendation = `Gapet er på ${gapWeeks} uker. Vurder å bruke feriedager for å dekke deler av eller hele perioden.`;
        }

        return (
          <div className="flex items-start gap-2 p-2 bg-muted/40 rounded-md">
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Anbefaling:</strong> {recommendation}
              <span className="text-muted-foreground"> Basert på oppgitt informasjon i veiviseren.</span>
            </p>
          </div>
        );
      })()}

      <p className="text-[11px] text-[var(--color-info-fg)]/60">
        Beregningen er et estimat basert på oppgitt lønn. Se full tidslinje og detaljer i kalenderen.
      </p>
    </div>
  );
}

function RecommendationBox({ economyResult, gap80Weeks, gap100Weeks, motherVacationDays, fatherVacationDays }: {
  economyResult: EconomyResult;
  gap80Weeks: number;
  gap100Weeks: number;
  motherVacationDays: number;
  fatherVacationDays: number;
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  const recommendedCoverage = economyResult.difference > 5000 ? 100 : economyResult.difference < -5000 ? 80 : null;
  const recommendationText = recommendedCoverage === 100
    ? '100% dekning kan lønne seg for deres situasjon'
    : recommendedCoverage === 80
    ? '80% dekning kan lønne seg for deres situasjon'
    : 'Forskjellen mellom 80% og 100% er liten for deres situasjon';

  const handleToggleExplanation = () => {
    const newShowExplanation = !showExplanation;
    setShowExplanation(newShowExplanation);
    if (newShowExplanation) {
      posthog.capture('recommendation_expanded', {
        recommended_coverage: recommendedCoverage,
      });
    }
  };

  return (
    <div className="rounded-lg bg-[var(--color-info-bg)] p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-[var(--color-info-fg)] shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-[var(--color-info-fg)]">
            {recommendationText}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--color-info-fg)]/70 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Detaljert tidslinje i kalenderen
            </p>
            <button
              onClick={handleToggleExplanation}
              className="text-xs text-[var(--color-info-fg)] font-medium flex items-center gap-0.5 hover:underline shrink-0"
            >
              Hvorfor?
              <ChevronDown className={`w-3 h-3 transition-transform ${showExplanation ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {showExplanation && (
        <ExplanationPanel
          result={economyResult}
          gap80Weeks={gap80Weeks}
          gap100Weeks={gap100Weeks}
          motherVacationDays={motherVacationDays}
          fatherVacationDays={fatherVacationDays}
        />
      )}
    </div>
  );
}

function SummaryRow({ icon, label, value, step, onEdit }: SummaryRowProps) {
  return (
    <button
      onClick={() => onEdit(step)}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors text-left"
    >
      <div className="p-1.5 bg-muted rounded-md">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export function SummaryStep({
  dueDate,
  rights,
  coverage,
  sharedWeeksToMother,
  daycareDate,
  daycareEnabled,
  motherJobSettings,
  fatherJobSettings,
  motherEconomy,
  fatherEconomy,
  leaveResult,
  onGoBack,
  onComplete,
}: SummaryStepProps) {
  const config = LEAVE_CONFIG[coverage];

  // Format rights label
  const rightsLabel =
    rights === 'both'
      ? 'Begge foreldre'
      : rights === 'mother-only'
      ? 'Kun mor'
      : 'Kun far/medmor';

  // Format distribution
  const sharedWeeksToFather = config.shared - sharedWeeksToMother;
  const distributionLabel =
    rights === 'both'
      ? `Mor ${sharedWeeksToMother} uker, far ${sharedWeeksToFather} uker fellesperiode`
      : 'Hele permisjonen til én forelder';

  // Calculate gap
  const gapWeeks = daycareEnabled && daycareDate
    ? Math.max(0, differenceInWeeks(daycareDate, leaveResult.father.end))
    : 0;

  // Job settings summary
  const hasJobSettings = motherJobSettings !== null || fatherJobSettings !== null;
  const jobLabel = hasJobSettings
    ? [
        motherJobSettings && `Mor: ${motherJobSettings.vacationDays} feriedager`,
        fatherJobSettings && `Far: ${fatherJobSettings.vacationDays} feriedager`,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Ikke angitt';

  // Economy summary
  const hasEconomyData = motherEconomy?.monthlySalary || fatherEconomy?.monthlySalary;
  const economyLabel = hasEconomyData ? 'Lønn angitt' : 'Ikke angitt';

  // Calculate gaps for BOTH scenarios (80% and 100% have different leave lengths → different gaps)
  const effectiveDaycareDate = daycareEnabled && daycareDate
    ? daycareDate
    : new Date(dueDate.getFullYear() + 3, 7, 1);

  const leaveResult80 = calculateLeave(dueDate, 80, rights, sharedWeeksToMother, 0, effectiveDaycareDate);
  const leaveResult100 = calculateLeave(dueDate, 100, rights, sharedWeeksToMother, 0, effectiveDaycareDate);

  // Calculate economy result if data exists — now with correct per-scenario gaps
  const economyResult = hasEconomyData && motherEconomy
    ? compareScenarios(
        motherEconomy,
        rights !== 'mother-only' ? fatherEconomy : undefined,
        sharedWeeksToMother,
        leaveResult80.gap,
        leaveResult100.gap
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Oppsummering</h2>
        <p className="text-sm text-muted-foreground">
          Trykk på et felt for å gå tilbake og endre
        </p>
      </div>

      {/* Summary rows — no Card wrapper */}
      <div className="rounded-lg border divide-y">
        <SummaryRow
          icon={<CalendarDays className="w-4 h-4" />}
          label="Termindato"
          value={format(dueDate, 'd. MMMM yyyy', { locale: nb })}
          step={1}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Users className="w-4 h-4" />}
          label="Rettigheter"
          value={rightsLabel}
          step={2}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Percent className="w-4 h-4" />}
          label="Dekningsgrad"
          value={`${coverage}% - ${config.total} uker`}
          step={3}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Users className="w-4 h-4" />}
          label="Fordeling"
          value={distributionLabel}
          step={4}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Baby className="w-4 h-4" />}
          label="Barnehagestart"
          value={
            daycareEnabled && daycareDate
              ? format(daycareDate, 'd. MMMM yyyy', { locale: nb })
              : 'Ikke angitt'
          }
          step={5}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Briefcase className="w-4 h-4" />}
          label="Jobbinnstillinger"
          value={jobLabel}
          step={6}
          onEdit={onGoBack}
        />
        <SummaryRow
          icon={<Wallet className="w-4 h-4" />}
          label="Økonomi"
          value={economyLabel}
          step={7}
          onEdit={onGoBack}
        />
      </div>

      {/* Gap warning — compact */}
      {gapWeeks > 0 && (
        <div className="px-3 py-2.5 bg-[var(--color-warning-bg)] border border-[var(--color-warning-bg)] rounded-lg flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--color-warning-fg)] shrink-0" />
          <p className="text-sm text-[var(--color-warning-fg)]">
            <span className="font-medium">{gapWeeks} {gapWeeks === 1 ? 'uke' : 'uker'}</span> mellom permisjonsslutt og barnehagestart
          </p>
        </div>
      )}

      {/* Recommendation based on economy data */}
      {economyResult && (
        <RecommendationBox
          economyResult={economyResult}
          gap80Weeks={leaveResult80.gap.weeks}
          gap100Weeks={leaveResult100.gap.weeks}
          motherVacationDays={motherJobSettings?.vacationDays ?? 0}
          fatherVacationDays={fatherJobSettings?.vacationDays ?? 0}
        />
      )}

      {/* Complete button */}
      <Button onClick={onComplete} size="lg" className="w-full">
        Gå til kalender
      </Button>
    </div>
  );
}
