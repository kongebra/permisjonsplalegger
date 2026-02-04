'use client';

import { useState } from 'react';
import { Plus, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PeriodListItem } from './PeriodListItem';
import { AddPeriodDialog } from './AddPeriodDialog';
import { QuotaSummary } from './QuotaSummary';
import { cn } from '@/lib/utils';
import type { Parent, ParentPeriodConfig, LeavePeriod, QuotaUsage, JobType } from '@/lib/types';

interface ParentPeriodSectionProps {
  parent: Parent;
  config: ParentPeriodConfig;
  onChange: (config: ParentPeriodConfig) => void;
  quotaUsage: QuotaUsage[];
  defaultStartDate?: Date;
}

const parentLabels: Record<Parent, { title: string; color: string }> = {
  mother: { title: 'Mor', color: 'text-pink-600 dark:text-pink-400' },
  father: { title: 'Far / Medmor', color: 'text-blue-600 dark:text-blue-400' },
};

export function ParentPeriodSection({
  parent,
  config,
  onChange,
  quotaUsage,
  defaultStartDate,
}: ParentPeriodSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const labels = parentLabels[parent];

  // Filter quota usage for this parent (mother/father quota, or shared)
  const relevantQuotaUsage = quotaUsage.filter(
    (q) => q.type === parent || q.type === 'shared'
  );

  const handleJobTypeChange = (value: string) => {
    onChange({
      ...config,
      jobType: value as JobType,
    });
  };

  const handleAddPeriod = (period: LeavePeriod) => {
    onChange({
      ...config,
      periods: [...config.periods, period].sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      ),
    });
  };

  const handleDeletePeriod = (id: string) => {
    onChange({
      ...config,
      periods: config.periods.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h4 className={cn('font-medium', labels.color)}>{labels.title}</h4>

      {/* Job type selector */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Jobbtype</Label>
        <RadioGroup
          value={config.jobType}
          onValueChange={handleJobTypeChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="office" id={`${parent}-office`} />
            <Label htmlFor={`${parent}-office`} className="flex items-center gap-1.5 cursor-pointer">
              <Briefcase className="h-4 w-4" />
              Vanlig jobb (man-fre)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="shift" id={`${parent}-shift`} />
            <Label htmlFor={`${parent}-shift`} className="flex items-center gap-1.5 cursor-pointer">
              <Calendar className="h-4 w-4" />
              Turnus/skift (man-lør)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Quota summary */}
      <QuotaSummary quotaUsage={relevantQuotaUsage} />

      {/* Period list */}
      <div className="space-y-2">
        {config.periods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            Ingen perioder lagt til ennå
          </p>
        ) : (
          config.periods.map((period) => (
            <PeriodListItem
              key={period.id}
              period={period}
              onDelete={handleDeletePeriod}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Legg til periode
      </Button>

      {/* Add period dialog */}
      <AddPeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        parent={parent}
        jobType={config.jobType}
        onAdd={handleAddPeriod}
        defaultStartDate={defaultStartDate}
      />
    </div>
  );
}
