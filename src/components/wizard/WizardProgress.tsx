'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const DEFAULT_LABELS = [
  'Termin',
  'Rettigheter',
  'Dekning',
  'Fordeling',
  'Barnehage',
  'Jobb',
  'Oppsummering',
];

export function WizardProgress({
  currentStep,
  totalSteps,
  labels = DEFAULT_LABELS,
}: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Steg {currentStep} av {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {labels[currentStep - 1]}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: step indicators */}
      <div className="hidden sm:flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs whitespace-nowrap',
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {labels[i]}
                </span>
              </div>

              {/* Connector line */}
              {stepNumber < totalSteps && (
                <div
                  className={cn(
                    'w-full h-0.5 mx-2 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ minWidth: '2rem' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
