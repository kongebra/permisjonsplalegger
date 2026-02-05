'use client';

import { cn } from '@/lib/utils';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage } from '@/lib/types';
import { Percent, Clock } from 'lucide-react';
import { GlossaryTerm } from '@/components/ui/glossary-term';

interface CoverageStepProps {
  value: Coverage;
  onChange: (value: Coverage) => void;
}

const coverageOptions: {
  value: Coverage;
  percentage: string;
  weeks: number;
  description: string;
  pros: string[];
  cons: string[];
}[] = [
  {
    value: 100,
    percentage: '100%',
    weeks: LEAVE_CONFIG[100].total,
    description: 'Full lønn (maks 6G)',
    pros: ['Høyere månedlig utbetaling', 'Mindre økonomisk stress'],
    cons: ['Kortere permisjon', 'Større gap før barnehage'],
  },
  {
    value: 80,
    percentage: '80%',
    weeks: LEAVE_CONFIG[80].total,
    description: '80% lønn (maks 6G)',
    pros: ['Lengre tid hjemme med barnet', 'Mindre gap før barnehage'],
    cons: ['Lavere månedlig utbetaling', 'Samme totale sum'],
  },
];

export function CoverageStep({ value, onChange }: CoverageStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Velg <GlossaryTerm term="dekningsgrad">dekningsgrad</GlossaryTerm></h2>
        <p className="text-muted-foreground">
          Du får samme totalsum uansett valg, men fordelt ulikt over tid
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {coverageOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'w-full p-5 rounded-lg border-2 text-left transition-all',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-card'
            )}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className={cn(
                    'w-5 h-5',
                    value === option.value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="text-2xl font-bold">{option.percentage}</span>
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

              {/* Duration */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{option.weeks} uker permisjon</span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">{option.description}</p>

              {/* Pros/Cons */}
              <div className="space-y-2 pt-2 border-t">
                <div className="space-y-1">
                  {option.pros.map((pro, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">+</span>
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {option.cons.map((con, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-orange-500">-</span>
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <p className="text-blue-800 dark:text-blue-200">
          <strong>Tips:</strong> De fleste sparer penger på 100% fordi <GlossaryTerm term="gap">gapet</GlossaryTerm> mellom
          permisjon og barnehage ofte blir dyrt å dekke.
        </p>
      </div>
    </div>
  );
}
