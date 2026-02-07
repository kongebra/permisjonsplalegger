'use client';

import { format, differenceInDays, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { X } from 'lucide-react';

interface PickerHeaderProps {
  startDate: Date | null;
  endDate: Date | null; // exclusive
  phase: 'idle' | 'start-selected' | 'range-selected';
  onClose: () => void;
}

export function PickerHeader({ startDate, endDate, phase, onClose }: PickerHeaderProps) {
  let prompt: string;
  switch (phase) {
    case 'idle':
      prompt = 'Velg startdato';
      break;
    case 'start-selected':
      prompt = 'Velg sluttdato';
      break;
    case 'range-selected': {
      const days = endDate ? differenceInDays(endDate, startDate!) : 0;
      const inclusiveEnd = endDate ? subDays(endDate, 1) : startDate!;
      prompt = `${format(startDate!, 'd. MMM', { locale: nb })} – ${format(inclusiveEnd, 'd. MMM', { locale: nb })} (${days} dager)`;
      break;
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
      <h3 className="font-semibold text-base">{prompt}</h3>
      <button
        onClick={onClose}
        className="rounded-full p-1.5 hover:bg-muted transition-colors"
        aria-label="Lukk"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
