'use client';

import { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { JobSettings, ParentRights, JobType } from '@/lib/types';
import { Briefcase, Calendar } from 'lucide-react';
import { InfoBox } from '@/components/ui/info-box';

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
    description: 'Helligdager trekkes fra',
  },
  {
    value: 'shift',
    label: 'Turnus/skift',
    description: 'Helligdager trekkes ikke',
  },
];

interface ParentJobSettingsProps {
  parent: 'mother' | 'father';
  label: string;
  settings: JobSettings | null;
  onChange: (settings: JobSettings | null) => void;
}

function ParentJobSettings({ parent, label, settings, onChange }: ParentJobSettingsProps) {
  const isExpanded = settings !== null;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (isExpanded) {
      onChange(null);
    } else {
      onChange({ jobType: 'office', vacationDays: 25 });
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleJobTypeChange = (jobType: JobType) => {
    onChange({ ...settings!, jobType });
  };

  const handleVacationDaysChange = (days: number) => {
    onChange({ ...settings!, vacationDays: Math.max(0, Math.min(50, days)) });
  };

  const colorClass = parent === 'mother' ? 'text-[var(--color-mother)]' : 'text-[var(--color-father)]';
  const borderClass = parent === 'mother'
    ? 'border-[var(--color-mother-muted)]'
    : 'border-[var(--color-father-muted)]';

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border-2 p-3 transition-colors',
        isExpanded ? cn(borderClass, 'space-y-3') : 'border-muted'
      )}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <p className={cn('font-semibold', colorClass)}>{label}</p>
        <button
          onClick={handleToggle}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full transition-colors',
            isExpanded
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isExpanded ? 'Fjern' : 'Legg til'}
        </button>
      </div>

      {isExpanded && settings && (
        <>
          {/* Job type — compact */}
          <div className="space-y-1.5">
            <Label className="text-sm">Jobbtype</Label>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Jobbtype">
              {jobTypeOptions.map((option) => (
                <button
                  key={option.value}
                  role="radio"
                  aria-checked={settings.jobType === option.value}
                  onClick={() => handleJobTypeChange(option.value)}
                  className={cn(
                    'p-2 rounded-md border text-left transition-all',
                    'hover:border-primary/50 focus:outline-none',
                    settings.jobType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Briefcase className={cn(
                      'w-3.5 h-3.5 shrink-0',
                      settings.jobType === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Vacation days — inline */}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${parent}-vacation`} className="text-sm flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Feriedager per år
            </Label>
            <Input
              id={`${parent}-vacation`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              value={settings.vacationDays}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                handleVacationDaysChange(parseInt(val) || 0);
              }}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              className="w-16 h-8 text-center"
            />
          </div>
        </>
      )}
    </div>
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
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Jobbinnstillinger</h2>
        <p className="text-sm text-muted-foreground">
          Valgfritt - brukes for å beregne feriedager
        </p>
      </div>

      <InfoBox variant="tip">
        <p>Valgfritt: Brukes kun for å plassere feriedager i kalenderen. Påvirker ikke den økonomiske beregningen.</p>
      </InfoBox>

      <div className="space-y-3">
        {showMother && (
          <ParentJobSettings
            parent="mother"
            label="Mor"
            settings={motherSettings}
            onChange={onMotherChange}
          />
        )}

        {showFather && (
          <ParentJobSettings
            parent="father"
            label="Far / Medmor"
            settings={fatherSettings}
            onChange={onFatherChange}
          />
        )}
      </div>
    </div>
  );
}
