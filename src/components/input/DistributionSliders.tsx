'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage, ParentRights } from '@/lib/types';

interface DistributionSlidersProps {
  coverage: Coverage;
  rights: ParentRights;
  sharedWeeksToMother: number;
  overlapWeeks: number;
  onSharedWeeksChange: (weeks: number) => void;
  onOverlapWeeksChange: (weeks: number) => void;
}

export function DistributionSliders({
  coverage,
  rights,
  sharedWeeksToMother,
  overlapWeeks,
  onSharedWeeksChange,
  onOverlapWeeksChange,
}: DistributionSlidersProps) {
  const config = LEAVE_CONFIG[coverage];
  const maxShared = config.shared;
  const maxOverlap = config.father; // Maks overlapp = fedrekvote

  // Skjul sliders hvis kun én forelder har rett
  if (rights !== 'both') {
    return null;
  }

  const sharedWeeksToFather = maxShared - sharedWeeksToMother;

  return (
    <div className="space-y-6">
      {/* Felleskvote fordeling */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label id="shared-weeks-label">Hvor mange uker av felleskvoten skal mor ta?</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" aria-label="Hjelp om felleskvote" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Fellesperioden ({maxShared} uker) kan fordeles fritt mellom
                  foreldrene. Resten går til far.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Slider
          value={[sharedWeeksToMother]}
          onValueChange={([value]) => onSharedWeeksChange(value)}
          max={maxShared}
          min={0}
          step={1}
          className="w-full"
          aria-labelledby="shared-weeks-label"
          aria-valuetext={`Mor ${sharedWeeksToMother} uker, Far ${sharedWeeksToFather} uker av ${maxShared}`}
        />
        <div className="text-sm text-center font-medium" aria-live="polite">
          <span className="text-mother">
            Mor: {sharedWeeksToMother} uker
          </span>
          <span className="text-muted-foreground mx-2">•</span>
          <span className="text-father">
            Far: {sharedWeeksToFather} uker
          </span>
          <span className="text-muted-foreground ml-2">
            (av {maxShared} uker)
          </span>
        </div>
      </div>

      {/* Overlapp */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label id="overlap-weeks-label">Overlapp (samtidig permisjon)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" aria-label="Hjelp om overlapp" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Far kan starte permisjonen før mor er ferdig. Dette forkorter
                  den totale kalendertiden permisjonen varer.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Slider
          value={[overlapWeeks]}
          onValueChange={([value]) => onOverlapWeeksChange(value)}
          max={maxOverlap}
          min={0}
          step={1}
          className="w-full"
          aria-labelledby="overlap-weeks-label"
          aria-valuetext={overlapWeeks === 0
            ? 'Ingen overlapp'
            : `${overlapWeeks} uker samtidig permisjon`}
        />
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {overlapWeeks === 0
            ? 'Ingen overlapp - far starter når mor er ferdig'
            : `${overlapWeeks} uker samtidig permisjon`}
        </div>
      </div>
    </div>
  );
}
