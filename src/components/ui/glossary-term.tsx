'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Info } from 'lucide-react';

const GLOSSARY: Record<string, string> = {
  foreldrepenger:
    'Penger fra NAV til foreldre som er hjemme med barnet etter fødsel.',
  kvote:
    'Uker reservert til henholdsvis mor og far. Kan ikke overføres til den andre forelderen.',
  fellesperiode:
    'Uker som kan fordeles fritt mellom foreldrene. Dere bestemmer selv hvem som tar dem.',
  dekningsgrad:
    'Andelen av lønnen (opptil 6G) som utbetales under permisjon. 100% = full lønn, 80% = 80%.',
  '6G': 'Ca 780 000 kr per år. Dette er det meste NAV kan utbetale, uansett lønnsnivå.',
  gap: 'Perioden mellom permisjonsslutt og barnehagestart.',
  feriepenger:
    'Ekstra utbetaling i juni basert på inntekt året før (10.2% av lønnen).',
};

interface GlossaryTermProps {
  term: keyof typeof GLOSSARY;
  children: React.ReactNode;
}

export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const explanation = GLOSSARY[term];

  if (!explanation) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 cursor-help inline-flex items-center gap-0.5"
        >
          {children}
          <Info className="w-3 h-3 text-muted-foreground/50 inline shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">
        <p>{explanation}</p>
      </PopoverContent>
    </Popover>
  );
}
