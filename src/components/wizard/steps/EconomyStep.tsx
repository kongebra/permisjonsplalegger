'use client';

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
import type { ParentEconomy, ParentRights } from '@/lib/types';
import { G } from '@/lib/constants';

interface EconomyStepProps {
  rights: ParentRights;
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
}: {
  label: string;
  economy: ParentEconomy;
  onChange: (economy: ParentEconomy) => void;
  colorClass: string;
}) {
  const sixG = 6 * G;

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
            onChange({ ...economy, monthlySalary: Math.max(0, Number(val)) });
          }}
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
          placeholder="50 000"
        />
      </div>

      {/* Dekker over 6G — inline toggle */}
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

      {/* Feriepenger — inline toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">Feriepenger fra arbeidsgiver?</Label>
          <HelpButton>
            <p>
              Hvis arbeidsgiver betaler lønn under permisjon, gis ofte full
              feriepengeopptjening. Ellers kun for de første 12-15 ukene.
            </p>
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
    </div>
  );
}

export function EconomyStep({
  rights,
  motherEconomy,
  fatherEconomy,
  onMotherChange,
  onFatherChange,
}: EconomyStepProps) {
  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Økonomisk informasjon</h2>
        <p className="text-sm text-muted-foreground">
          Valgfritt - for å beregne faktisk utbetaling
        </p>
      </div>

      {/* Tips — compact */}
      <InfoBox variant="tip">
        <p>Med lønnsinformasjon kan vi beregne den reelle forskjellen mellom 80% og 100% dekning for deres situasjon.</p>
      </InfoBox>

      {/* Parent inputs */}
      <div className="grid gap-3 md:grid-cols-2">
        {showMother && (
          <ParentEconomySection
            label="Mor"
            economy={motherEconomy}
            onChange={onMotherChange}
            colorClass="text-[var(--color-mother)]"
          />
        )}
        {showFather && (
          <ParentEconomySection
            label="Far / Medmor"
            economy={fatherEconomy}
            onChange={onFatherChange}
            colorClass="text-[var(--color-father)]"
          />
        )}
      </div>
    </div>
  );
}
