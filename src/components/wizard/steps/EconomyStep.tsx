'use client';

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import { InfoBox } from '@/components/ui/info-box';
import { formatCurrency } from '@/lib/format';
import type { ParentEconomy, ParentRights, Coverage } from '@/lib/types';
import { G } from '@/lib/constants';
import posthog from 'posthog-js';

interface EconomyStepProps {
  rights: ParentRights;
  coverage: Coverage;
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  onMotherChange: (economy: ParentEconomy) => void;
  onFatherChange: (economy: ParentEconomy) => void;
}

function HelpButton({ children }: { children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button">
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ParentEconomySection({
  label,
  economy,
  onChange,
  colorClass,
  coverage,
  onSalaryEntered,
}: {
  label: string;
  economy: ParentEconomy;
  onChange: (economy: ParentEconomy) => void;
  colorClass: string;
  coverage: Coverage;
  onSalaryEntered: (parent: string) => void;
}) {
  const sixG = 6 * G;
  const hasTrackedSalary = useRef(false);

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <p className={`font-semibold ${colorClass}`}>{label}</p>

      {/* Månedslønn */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Månedslønn (brutto)</Label>
          <HelpButton>
            <p>Fast månedslønn før skatt. Ikke inkluder bonus eller overtid.</p>
          </HelpButton>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={economy.monthlySalary || ''}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            const salary = Math.max(0, Number(val));
            onChange({ ...economy, monthlySalary: salary });
            // Track first salary entry per parent
            if (salary > 0 && !hasTrackedSalary.current) {
              hasTrackedSalary.current = true;
              onSalaryEntered(label);
            }
          }}
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
          placeholder="50 000"
        />
      </div>

      {/* Provisjon/variabel inntekt */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tapt variabel inntekt per mnd</Label>
          <HelpButton>
            <p>Bonus, provisjon eller andre variable tillegg du mister under permisjon.
            Sett 0 hvis du kun har fastlønn.</p>
          </HelpButton>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={economy.monthlyCommissionLoss || ''}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onChange({ ...economy, monthlyCommissionLoss: Math.max(0, Number(val)) });
          }}
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
          placeholder="0"
        />
      </div>

      {/* 6G cap warning */}
      {economy.monthlySalary * 12 > sixG && !economy.employerCoversAbove6G && (
        <InfoBox variant="warning">
          <p>Lønn over 6G-taket. NAV dekker maks {formatCurrency(sixG)}/år.
          Sjekk om arbeidsgiver dekker differansen.</p>
        </InfoBox>
      )}

      {/* Dekker over 6G — inline toggle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm">Dekker jobb lønn over 6G?</Label>
            <HelpButton>
              <p>
                NAV dekker maks 6G ({formatCurrency(sixG)}/år, ca. {formatCurrency(Math.round(sixG / 12))}/mnd).
                Tjener man mer enn dette, dekker noen arbeidsgivere differansen.
              </p>
              <p className="mt-1 text-muted-foreground">
                1G = {formatCurrency(G)} (per 1. mai 2025)
              </p>
            </HelpButton>
          </div>
          <div className="flex gap-1 shrink-0">
            <Toggle
              size="sm"
              pressed={economy.employerCoversAbove6G}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerCoversAbove6G: pressed })
              }
              className="data-[state=on]:bg-green-600 data-[state=on]:text-white h-7 px-2.5 text-xs"
            >
              Ja
            </Toggle>
            <Toggle
              size="sm"
              pressed={!economy.employerCoversAbove6G}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerCoversAbove6G: !pressed })
              }
              className="data-[state=on]:bg-muted h-7 px-2.5 text-xs"
            >
              Nei
            </Toggle>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">6G = {formatCurrency(sixG)}/år ≈ {formatCurrency(Math.round(sixG / 12))}/mnd</p>
      </div>

      {/* Feriepenger — inline toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">Feriepenger fra arbeidsgiver?</Label>
          <HelpButton>
            <div className="space-y-2">
              <p><strong>Ja</strong> = Arbeidsgiver betaler lønnen din under permisjon.
              Du opptjener feriepenger som normalt (10,2% av årslønn).</p>
              <p><strong>Nei</strong> = NAV utbetaler foreldrepengene. Da opptjenes feriepenger
              kun for de første {coverage === 100 ? '12' : '15'} ukene.</p>
              <p className="text-muted-foreground">Usikker? Spør arbeidsgiveren din.</p>
            </div>
          </HelpButton>
        </div>
        <div className="flex gap-1 shrink-0">
          <Toggle
            size="sm"
            pressed={economy.employerPaysFeriepenger}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerPaysFeriepenger: pressed })
            }
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white h-7 px-2.5 text-xs"
          >
            Ja
          </Toggle>
          <Toggle
            size="sm"
            pressed={!economy.employerPaysFeriepenger}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerPaysFeriepenger: !pressed })
            }
            className="data-[state=on]:bg-muted h-7 px-2.5 text-xs"
          >
            Nei
          </Toggle>
        </div>
      </div>

      {/* Feriepengegrunnlag — vises når NAV betaler */}
      {!economy.employerPaysFeriepenger && economy.monthlySalary > 0 && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Feriepengegrunnlag (valgfritt)</Label>
              <HelpButton>
                <div className="space-y-2">
                  <p>Feriepengegrunnlaget er inntekten du opptjente i fjor som danner
                  grunnlaget for feriepengene du får utbetalt i juni.</p>
                  <p>Hvis du ikke fyller inn, bruker vi årslønn ({formatCurrency(economy.monthlySalary * 12)}) som estimat.</p>
                </div>
              </HelpButton>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              value={economy.feriepengegrunnlag || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                const num = Number(val);
                onChange({ ...economy, feriepengegrunnlag: num > 0 ? num : undefined });
              }}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              placeholder={formatCurrency(economy.monthlySalary * 12)}
            />
          </div>

          {/* Juni-trekk forklaring */}
          <InfoBox variant="info">
            <p className="font-medium">Hvorfor trekkes jeg i lønn i juni?</p>
            <p className="mt-1">I juni utbetales feriepenger basert på forrige års inntekt.
            Når NAV betaler foreldrepenger, opptjener du kun feriepenger
            for de første {coverage === 100 ? '12' : '15'} ukene.
            Resten av permisjonen gir ingen opptjening — så juni-lønnen
            året etter blir lavere enn normalt.</p>
          </InfoBox>
        </>
      )}
    </div>
  );
}

export function EconomyStep({
  rights,
  coverage,
  motherEconomy,
  fatherEconomy,
  onMotherChange,
  onFatherChange,
}: EconomyStepProps) {
  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  const handleSalaryEntered = (parent: string) => {
    posthog.capture('economy_data_entered', {
      parent: parent.toLowerCase(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Økonomisk informasjon</h2>
        <p className="text-sm text-muted-foreground">
          Anbefalt - gir deg en faktisk sammenligning av 80% vs 100%
        </p>
      </div>

      {/* Tips — compact */}
      <InfoBox variant="tip">
        <p>Med lønnsinformasjon kan vi beregne den reelle forskjellen mellom 80% og 100% dekning for deres situasjon.</p>
      </InfoBox>

      {/* Parent inputs */}
      <div className="grid gap-3 sm:grid-cols-2">
        {showMother && (
          <ParentEconomySection
            label="Mor"
            economy={motherEconomy}
            onChange={onMotherChange}
            colorClass="text-[var(--color-mother)]"
            coverage={coverage}
            onSalaryEntered={handleSalaryEntered}
          />
        )}
        {showFather && (
          <ParentEconomySection
            label="Far / Medmor"
            economy={fatherEconomy}
            onChange={onFatherChange}
            colorClass="text-[var(--color-father)]"
            coverage={coverage}
            onSalaryEntered={handleSalaryEntered}
          />
        )}
      </div>
    </div>
  );
}
