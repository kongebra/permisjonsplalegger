'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import type { ParentEconomy, ParentRights } from '@/lib/types';
import { G } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

interface EconomySectionProps {
  rights: ParentRights;
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  onMotherEconomyChange: (economy: ParentEconomy) => void;
  onFatherEconomyChange: (economy: ParentEconomy) => void;
}

interface ParentEconomyInputProps {
  label: string;
  economy: ParentEconomy;
  onChange: (economy: ParentEconomy) => void;
  colorClass: string;
}

function ParentEconomyInput({
  label,
  economy,
  onChange,
  colorClass,
}: ParentEconomyInputProps) {
  const sixG = 6 * G;

  return (
    <div className="space-y-4">
      <h4 className={`font-medium ${colorClass}`}>{label}</h4>

      {/* Månedslønn */}
      <div className="space-y-2">
        <Label>Månedslønn (brutto)</Label>
        <Input
          type="number"
          min={0}
          value={economy.monthlySalary || ''}
          onChange={(e) =>
            onChange({
              ...economy,
              monthlySalary: Math.max(0, Number(e.target.value)),
            })
          }
          placeholder="50000"
        />
      </div>

      {/* Provisjon/bonus */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Gjennomsnittlig provisjon/bonus per måned</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Provisjon og bonus erstattes ikke av NAV. Dette er et tap du
                  har i permisjonsperioden.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          type="number"
          min={0}
          value={economy.monthlyCommissionLoss || ''}
          onChange={(e) =>
            onChange({
              ...economy,
              monthlyCommissionLoss: Math.max(0, Number(e.target.value)),
            })
          }
          placeholder="0"
        />
      </div>

      {/* Dekker arbeidsgiver over 6G */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm font-medium">
          Dekker arbeidsgiver lønn over 6G?
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" aria-label="Hjelp om 6G-dekning" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  NAV dekker maks 6G ({formatCurrency(sixG)}/år). Noen
                  arbeidsgivere dekker differansen for høytlønnede.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </legend>
        <div className="flex gap-2" role="group" aria-label="Dekker arbeidsgiver over 6G">
          <Toggle
            pressed={economy.employerCoversAbove6G}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerCoversAbove6G: pressed })
            }
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            aria-label="Ja, arbeidsgiver dekker over 6G"
          >
            Ja
          </Toggle>
          <Toggle
            pressed={!economy.employerCoversAbove6G}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerCoversAbove6G: !pressed })
            }
            className="data-[state=on]:bg-destructive data-[state=on]:text-white"
            aria-label="Nei, arbeidsgiver dekker ikke over 6G"
          >
            Nei
          </Toggle>
        </div>
      </fieldset>

      {/* Feriepenger */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm font-medium">
          Får du feriepenger fra arbeidsgiver som om du var i jobb?
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" aria-label="Hjelp om feriepenger" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Hvis arbeidsgiver betaler lønn under permisjon (og får refusjon
                  fra NAV), får du ofte full feriepengeopptjening. Hvis NAV
                  betaler direkte, får du kun feriepenger for de første 12-15
                  ukene.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </legend>
        <div className="flex gap-2" role="group" aria-label="Feriepenger fra arbeidsgiver">
          <Toggle
            pressed={economy.employerPaysFeriepenger}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerPaysFeriepenger: pressed })
            }
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            aria-label="Ja, feriepenger fra arbeidsgiver"
          >
            Ja (arbeidsgiver)
          </Toggle>
          <Toggle
            pressed={!economy.employerPaysFeriepenger}
            onPressedChange={(pressed) =>
              onChange({ ...economy, employerPaysFeriepenger: !pressed })
            }
            className="data-[state=on]:bg-warning-fg data-[state=on]:text-white"
            aria-label="Nei, feriepenger fra NAV"
          >
            Nei (NAV)
          </Toggle>
        </div>
      </fieldset>
    </div>
  );
}

export function EconomySection({
  rights,
  motherEconomy,
  fatherEconomy,
  onMotherEconomyChange,
  onFatherEconomyChange,
}: EconomySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
        <span className="font-medium">Økonomisk sammenligning (valgfritt)</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="rounded-lg border p-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Fyll inn økonomisk informasjon for å sammenligne 80% vs 100%
            dekning.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Mor */}
            {rights !== 'father-only' && (
              <ParentEconomyInput
                label="Mor"
                economy={motherEconomy}
                onChange={onMotherEconomyChange}
                colorClass="text-mother"
              />
            )}

            {/* Far */}
            {rights !== 'mother-only' && (
              <ParentEconomyInput
                label="Far / Medmor"
                economy={fatherEconomy}
                onChange={onFatherEconomyChange}
                colorClass="text-father"
              />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
