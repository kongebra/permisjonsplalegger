'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const GLOSSARY: Record<string, string> = {
  foreldrepenger:
    'Pengene du får fra NAV når du er hjemme med barnet etter fødsel.',
  kvote:
    'Uker som er reservert til deg. Du mister dem hvis du ikke bruker dem.',
  fellesperiode:
    'Uker som kan fordeles fritt mellom foreldrene. Dere bestemmer selv hvem som tar dem.',
  dekningsgrad:
    'Hvor mye av lønnen din du får utbetalt. 100% = full lønn, 80% = 80% av lønnen.',
  '6G': 'Ca 780 000 kr per år. Dette er det meste NAV kan utbetale, uansett hvor mye du tjener.',
  gap: 'Perioden mellom permisjonen slutter og barnet får barnehageplass. Du har ingen inntekt i denne perioden.',
  feriepenger:
    'Ekstra lønn du får utbetalt i juni basert på hva du tjente året før (10.2% av lønnen).',
};

interface GlossaryTermProps {
  term: keyof typeof GLOSSARY;
  children: React.ReactNode;
}

export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const explanation = GLOSSARY[term];

  if (!explanation) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted decoration-muted-foreground cursor-help">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
}
