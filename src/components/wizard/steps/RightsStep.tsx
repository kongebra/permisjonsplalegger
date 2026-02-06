'use client';

import { cn } from '@/lib/utils';
import type { ParentRights } from '@/lib/types';
import { Users, User } from 'lucide-react';
import { InfoBox } from '@/components/ui/info-box';

interface RightsStepProps {
  value: ParentRights;
  onChange: (value: ParentRights) => void;
}

const rightsOptions: {
  value: ParentRights;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'both',
    label: 'Begge foreldre',
    description: 'Begge har opptjent rett til foreldrepenger gjennom arbeid',
    icon: <Users className="w-8 h-8" />,
  },
  {
    value: 'mother-only',
    label: 'Kun mor',
    description: 'Kun mor har opptjent rett til foreldrepenger',
    icon: <User className="w-8 h-8" />,
  },
  {
    value: 'father-only',
    label: 'Kun far/medmor',
    description: 'Kun far/medmor har opptjent rett til foreldrepenger',
    icon: <User className="w-8 h-8" />,
  },
];

export function RightsStep({ value, onChange }: RightsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Hvem har rett til foreldrepenger?</h2>
        <p className="text-muted-foreground">
          Kravet er å ha vært i arbeid minst 6 av de siste 10 månedene
        </p>
      </div>

      {/* Info box for single parents */}
      {(value === 'mother-only' || value === 'father-only') && (
        <InfoBox variant="info">
          <p className="font-medium">Som enslig forelder</p>
          <p className="mt-1">
            Forelderen har rett til hele permisjonsperioden inkludert fellesperioden.
            Det betyr opptil 46 uker (100%) eller 56 uker (80%) totalt, pluss 3 uker før termin.
          </p>
        </InfoBox>
      )}

      <div className="grid gap-4" role="radiogroup" aria-label="Hvem har rett til foreldrepenger?">
        {rightsOptions.map((option) => (
          <button
            key={option.value}
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'w-full p-4 rounded-lg border-2 text-left transition-all',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-card'
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'p-3 rounded-full',
                  value === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{option.label}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  value === option.value
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                )}
              >
                {value === option.value && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
