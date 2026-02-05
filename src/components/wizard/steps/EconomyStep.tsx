'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Lightbulb } from 'lucide-react';
import type { ParentEconomy, ParentRights } from '@/lib/types';
import { G } from '@/lib/constants';

interface EconomyStepProps {
  rights: ParentRights;
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  onMotherChange: (economy: ParentEconomy) => void;
  onFatherChange: (economy: ParentEconomy) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);
}

function ParentEconomyCard({
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg ${colorClass}`}>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Maanedslonn */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Maanedslonn (brutto)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Din faste maanedslonn for skatt. Ikke inkluder bonus eller overtid.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="number"
            min={0}
            value={economy.monthlySalary || ''}
            onChange={(e) =>
              onChange({ ...economy, monthlySalary: Math.max(0, Number(e.target.value)) })
            }
            placeholder="50000"
          />
        </div>

        {/* Dekker over 6G */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Dekker arbeidsgiver lonn over 6G?</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    NAV dekker maks 6G ({formatCurrency(sixG)}/ar = {formatCurrency(sixG / 12)}
                    /mnd). Noen arbeidsgivere dekker differansen for ansatte som tjener mer.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Toggle
              pressed={economy.employerCoversAbove6G}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerCoversAbove6G: pressed })
              }
              className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
            >
              Ja
            </Toggle>
            <Toggle
              pressed={!economy.employerCoversAbove6G}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerCoversAbove6G: !pressed })
              }
              className="data-[state=on]:bg-muted"
            >
              Nei
            </Toggle>
          </div>
        </div>

        {/* Feriepenger */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Feriepenger fra arbeidsgiver?</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Hvis arbeidsgiver betaler lonn under permisjon, far du ofte full
                    feriepengeopptjening. Hvis NAV betaler direkte, far du kun feriepenger for de
                    forste 12-15 ukene.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Toggle
              pressed={economy.employerPaysFeriepenger}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerPaysFeriepenger: pressed })
              }
              className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
            >
              Ja
            </Toggle>
            <Toggle
              pressed={!economy.employerPaysFeriepenger}
              onPressedChange={(pressed) =>
                onChange({ ...economy, employerPaysFeriepenger: !pressed })
              }
              className="data-[state=on]:bg-muted"
            >
              Nei (NAV)
            </Toggle>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Okonomisk informasjon</h2>
        <p className="text-muted-foreground">
          Valgfritt - for a beregne hva du faktisk far utbetalt
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex gap-3">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Hvorfor spor vi om dette?</p>
          <p className="mt-1">
            Med lonnsinformasjon kan vi vise deg hvor mye du faktisk far utbetalt per maned, og
            beregne den reelle forskjellen mellom 80% og 100% dekning for din situasjon.
          </p>
        </div>
      </div>

      {/* Parent inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        {showMother && (
          <ParentEconomyCard
            label="Mor"
            economy={motherEconomy}
            onChange={onMotherChange}
            colorClass="text-pink-600 dark:text-pink-400"
          />
        )}
        {showFather && (
          <ParentEconomyCard
            label="Far / Medmor"
            economy={fatherEconomy}
            onChange={onFatherChange}
            colorClass="text-blue-600 dark:text-blue-400"
          />
        )}
      </div>

      {/* Skip hint */}
      <p className="text-center text-sm text-muted-foreground">
        Du kan hoppe over dette steget og legge til okonomisk informasjon senere.
      </p>
    </div>
  );
}
