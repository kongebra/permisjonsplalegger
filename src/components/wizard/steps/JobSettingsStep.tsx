'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { JobSettings, ParentRights, JobType } from '@/lib/types';
import { Briefcase, Calendar, Building2 } from 'lucide-react';

interface JobSettingsStepProps {
  rights: ParentRights;
  motherSettings: JobSettings | null;
  fatherSettings: JobSettings | null;
  onMotherChange: (settings: JobSettings | null) => void;
  onFatherChange: (settings: JobSettings | null) => void;
}

const jobTypeOptions: { value: JobType; label: string; description: string }[] = [
  {
    value: 'office',
    label: 'Kontorjobb',
    description: 'Helligdager trekkes fra feriedager',
  },
  {
    value: 'shift',
    label: 'Turnus/skift',
    description: 'Helligdager trekkes ikke fra',
  },
];

interface ParentJobSettingsProps {
  parent: 'mother' | 'father';
  label: string;
  settings: JobSettings | null;
  onChange: (settings: JobSettings | null) => void;
}

function ParentJobSettings({ parent, label, settings, onChange }: ParentJobSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(settings !== null);

  const handleToggle = () => {
    if (isExpanded) {
      onChange(null);
      setIsExpanded(false);
    } else {
      onChange({ jobType: 'office', vacationDays: 25 });
      setIsExpanded(true);
    }
  };

  const handleJobTypeChange = (jobType: JobType) => {
    onChange({ ...settings!, jobType });
  };

  const handleVacationDaysChange = (days: number) => {
    onChange({ ...settings!, vacationDays: Math.max(0, Math.min(50, days)) });
  };

  const color = parent === 'mother' ? 'pink' : 'blue';

  return (
    <Card className={cn(
      'border-2 transition-colors',
      isExpanded
        ? `border-${color}-200 dark:border-${color}-800`
        : 'border-muted'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className={cn(
              'w-5 h-5',
              parent === 'mother' ? 'text-pink-500' : 'text-blue-500'
            )} />
            {label}
          </CardTitle>
          <button
            onClick={handleToggle}
            className={cn(
              'text-sm px-3 py-1 rounded-full transition-colors',
              isExpanded
                ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isExpanded ? 'Fjern' : 'Legg til'}
          </button>
        </div>
        <CardDescription>
          {isExpanded ? 'Jobbinnstillinger for ferieberegning' : 'Valgfritt - for ferieberegning'}
        </CardDescription>
      </CardHeader>

      {isExpanded && settings && (
        <CardContent className="space-y-4">
          {/* Job type selection */}
          <div className="space-y-2">
            <Label>Jobbtype</Label>
            <div className="grid grid-cols-2 gap-2">
              {jobTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleJobTypeChange(option.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    'hover:border-primary/50 focus:outline-none',
                    settings.jobType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className={cn(
                      'w-4 h-4',
                      settings.jobType === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Vacation days */}
          <div className="space-y-2">
            <Label htmlFor={`${parent}-vacation`} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Feriedager per år
            </Label>
            <Input
              id={`${parent}-vacation`}
              type="number"
              min={0}
              max={50}
              value={settings.vacationDays}
              onChange={(e) => handleVacationDaysChange(parseInt(e.target.value) || 0)}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Standard er 25 dager (5 uker)
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function JobSettingsStep({
  rights,
  motherSettings,
  fatherSettings,
  onMotherChange,
  onFatherChange,
}: JobSettingsStepProps) {
  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Jobbinnstillinger</h2>
        <p className="text-muted-foreground">
          Valgfritt - brukes for å beregne feriedager
        </p>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <p className="text-blue-800 dark:text-blue-200">
          <strong>Tips:</strong> Du kan hoppe over dette steget og legge til feriedager
          manuelt i kalenderen etterpå.
        </p>
      </div>

      <div className="space-y-4">
        {showMother && (
          <ParentJobSettings
            parent="mother"
            label="Mors jobb"
            settings={motherSettings}
            onChange={onMotherChange}
          />
        )}

        {showFather && (
          <ParentJobSettings
            parent="father"
            label="Fars jobb"
            settings={fatherSettings}
            onChange={onFatherChange}
          />
        )}
      </div>
    </div>
  );
}
