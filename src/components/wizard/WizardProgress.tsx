'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { WIZARD_STEPS } from '@/lib/constants';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const DEFAULT_LABELS = WIZARD_STEPS.map((s) => s.label);

export function WizardProgress({
  currentStep,
  totalSteps,
  labels = DEFAULT_LABELS,
}: WizardProgressProps) {
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <nav aria-label="Wizard-fremgang" className="w-full">
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
        <div
          className="w-full bg-muted rounded-full h-2"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Steg ${currentStep} av ${totalSteps}: ${labels[currentStep - 1]}`}
        >
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop: step indicators */}
      <ol className="hidden sm:flex items-center justify-between" aria-label="Wizard-steg">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li
              key={stepNumber}
              className="flex items-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
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
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
