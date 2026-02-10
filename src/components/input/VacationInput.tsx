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
import type { VacationInput as VacationInputType, ParentRights } from '@/lib/types';

interface VacationInputProps {
  vacation: VacationInputType;
  onChange: (vacation: VacationInputType) => void;
  rights: ParentRights;
}

export function VacationInput({ vacation, onChange, rights }: VacationInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
        <span className="font-medium">Feriedager (valgfritt)</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="rounded-lg border p-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Feriedager kan brukes til å dekke gapet mellom permisjonsslutt og barnehagestart,
            eller for å ha mer tid sammen.
          </p>

          {/* Mors feriedager */}
          {showMother && (
            <div className="space-y-4">
              <h4 className="font-medium text-mother">Mor</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Feriedager etter permisjon</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Antall feriedager mor tar etter permisjonen sin er ferdig.
                          Kan brukes til å få mer tid før far starter.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={vacation.mother.daysAfter || ''}
                  onChange={(e) =>
                    onChange({
                      ...vacation,
                      mother: {
                        ...vacation.mother,
                        daysAfter: Math.max(0, Math.min(25, Number(e.target.value))),
                      },
                    })
                  }
                  placeholder="0"
                />
              </div>

              {vacation.mother.daysAfter > 0 && showFather && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Overlapper ferien med fars permisjon?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Hvis ja: mor er hjemme på ferie samtidig som far starter permisjon.
                            Hvis nei: fars permisjon skyves med antall feriedager.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    <Toggle
                      pressed={vacation.mother.duringFatherLeave}
                      onPressedChange={(pressed) =>
                        onChange({
                          ...vacation,
                          mother: { ...vacation.mother, duringFatherLeave: pressed },
                        })
                      }
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      Ja (overlapp)
                    </Toggle>
                    <Toggle
                      pressed={!vacation.mother.duringFatherLeave}
                      onPressedChange={(pressed) =>
                        onChange({
                          ...vacation,
                          mother: { ...vacation.mother, duringFatherLeave: !pressed },
                        })
                      }
                      className="data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                    >
                      Nei (skyv far)
                    </Toggle>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fars feriedager */}
          {showFather && (
            <div className="space-y-4">
              <h4 className="font-medium text-father">Far / Medmor</h4>

              {/* Feriedager FØR permisjon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Feriedager før permisjon</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Antall feriedager far tar før permisjonen starter.
                          Kan brukes for å ha mer tid sammen som familie.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={vacation.father.daysBefore || ''}
                  onChange={(e) =>
                    onChange({
                      ...vacation,
                      father: {
                        ...vacation.father,
                        daysBefore: Math.max(0, Math.min(25, Number(e.target.value))),
                      },
                    })
                  }
                  placeholder="0"
                />
              </div>

              {vacation.father.daysBefore > 0 && showMother && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Overlapper ferien med mors permisjon?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Hvis ja: far er hjemme på ferie samtidig som mor har permisjon.
                            Hvis nei: fars permisjonsstart skyves med antall feriedager.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    <Toggle
                      pressed={vacation.father.duringMotherLeave}
                      onPressedChange={(pressed) =>
                        onChange({
                          ...vacation,
                          father: { ...vacation.father, duringMotherLeave: pressed },
                        })
                      }
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      Ja (overlapp)
                    </Toggle>
                    <Toggle
                      pressed={!vacation.father.duringMotherLeave}
                      onPressedChange={(pressed) =>
                        onChange({
                          ...vacation,
                          father: { ...vacation.father, duringMotherLeave: !pressed },
                        })
                      }
                      className="data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                    >
                      Nei (skyv far)
                    </Toggle>
                  </div>
                </div>
              )}

              {/* Feriedager ETTER permisjon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Feriedager etter permisjon</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Antall feriedager far tar etter permisjonen sin er ferdig.
                          Brukes til å dekke gapet før barnehagestart.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={vacation.father.daysAfter || ''}
                  onChange={(e) =>
                    onChange({
                      ...vacation,
                      father: {
                        ...vacation.father,
                        daysAfter: Math.max(0, Math.min(25, Number(e.target.value))),
                      },
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
