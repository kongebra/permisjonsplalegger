'use client';

import { format, differenceInDays, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { countVacationDays } from '@/lib/calculator/dates';
import { Button } from '@/components/ui/button';

interface PickerFooterProps {
  startDate: Date | null;
  endDate: Date | null; // exclusive
  onConfirm: () => void;
}

export function PickerFooter({ startDate, endDate, onConfirm }: PickerFooterProps) {
  const hasRange = startDate && endDate;
  const days = hasRange ? differenceInDays(endDate, startDate) : 0;
  const workDays = hasRange ? countVacationDays(startDate, endDate, 'office') : 0;

  return (
    <div className="px-4 py-3 border-t space-y-3 shrink-0" aria-live="polite">
      {hasRange && days > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {format(startDate, 'EEE d. MMM', { locale: nb })} —{' '}
          {format(subDays(endDate, 1), 'EEE d. MMM', { locale: nb })}
          {' · '}
          {days} kalenderdager ({workDays} feriedager)
        </p>
      )}
      <Button
        className="w-full"
        onClick={onConfirm}
        disabled={!hasRange || days <= 0}
      >
        Bekreft
      </Button>
    </div>
  );
}
