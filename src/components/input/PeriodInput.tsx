'use client';

import { useMemo } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { ParentPeriodSection } from './ParentPeriodSection';
import { calculateQuotaUsage, validatePeriods } from '@/lib/calculator';
import type {
  ParentPeriodConfig,
  ParentRights,
  Coverage,
  ValidationResult,
} from '@/lib/types';

interface PeriodInputProps {
  motherConfig: ParentPeriodConfig;
  fatherConfig: ParentPeriodConfig;
  onMotherConfigChange: (config: ParentPeriodConfig) => void;
  onFatherConfigChange: (config: ParentPeriodConfig) => void;
  rights: ParentRights;
  coverage: Coverage;
  dueDate: Date;
}

export function PeriodInput({
  motherConfig,
  fatherConfig,
  onMotherConfigChange,
  onFatherConfigChange,
  rights,
  coverage,
  dueDate,
}: PeriodInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  // Calculate quota usage
  const quotaUsage = useMemo(() => {
    return calculateQuotaUsage(motherConfig, fatherConfig, coverage, rights);
  }, [motherConfig, fatherConfig, coverage, rights]);

  // Validate periods
  const validation: ValidationResult = useMemo(() => {
    return validatePeriods(motherConfig, fatherConfig, coverage, rights, dueDate);
  }, [motherConfig, fatherConfig, coverage, rights, dueDate]);

  const hasIssues = !validation.isValid || validation.warnings.length > 0;
  const totalPeriods = motherConfig.periods.length + fatherConfig.periods.length;

  // Calculate suggested start date for new periods
  const getLatestEndDate = (config: ParentPeriodConfig): Date | undefined => {
    if (config.periods.length === 0) return undefined;
    return config.periods.reduce(
      (latest, p) => (p.endDate > latest ? p.endDate : latest),
      config.periods[0].endDate
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium">Permisjonsperioder (avansert)</span>
          {totalPeriods > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {totalPeriods} {totalPeriods === 1 ? 'periode' : 'perioder'}
            </span>
          )}
          {hasIssues && (
            <AlertTriangle className="h-4 w-4 text-warning-fg" />
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Legg til spesifikke perioder for permisjon, ferie og ulønnet fravær.
            Dette gir deg full kontroll over planleggingen.
          </p>

          {/* Validation warnings/errors */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div
                  key={`error-${i}`}
                  className="text-sm text-destructive bg-destructive/10 p-2 rounded"
                >
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div
                  key={`warning-${i}`}
                  className="text-sm text-warning-fg bg-warning-bg p-2 rounded"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* Tabs for each parent (or just one section if only one parent) */}
          {showMother && showFather ? (
            <Tabs defaultValue="mother" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mother" className="text-mother">
                  Mor
                  {motherConfig.periods.length > 0 && (
                    <span className="ml-1 text-xs">({motherConfig.periods.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="father" className="text-father">
                  Far / Medmor
                  {fatherConfig.periods.length > 0 && (
                    <span className="ml-1 text-xs">({fatherConfig.periods.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mother" className="pt-4">
                <ParentPeriodSection
                  parent="mother"
                  config={motherConfig}
                  onChange={onMotherConfigChange}
                  quotaUsage={quotaUsage}
                  defaultStartDate={getLatestEndDate(motherConfig)}
                />
              </TabsContent>

              <TabsContent value="father" className="pt-4">
                <ParentPeriodSection
                  parent="father"
                  config={fatherConfig}
                  onChange={onFatherConfigChange}
                  quotaUsage={quotaUsage}
                  defaultStartDate={getLatestEndDate(fatherConfig) ?? getLatestEndDate(motherConfig)}
                />
              </TabsContent>
            </Tabs>
          ) : showMother ? (
            <ParentPeriodSection
              parent="mother"
              config={motherConfig}
              onChange={onMotherConfigChange}
              quotaUsage={quotaUsage}
              defaultStartDate={getLatestEndDate(motherConfig)}
            />
          ) : (
            <ParentPeriodSection
              parent="father"
              config={fatherConfig}
              onChange={onFatherConfigChange}
              quotaUsage={quotaUsage}
              defaultStartDate={getLatestEndDate(fatherConfig)}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
