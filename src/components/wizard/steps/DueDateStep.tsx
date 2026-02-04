'use client';

import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface DueDateStepProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DueDateStep({ value, onChange }: DueDateStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Når er termin?</h2>
        <p className="text-muted-foreground">
          Vi beregner permisjonen basert på termindato
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Termindato</CardTitle>
          <CardDescription>
            Velg forventet fødselsdato
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => date && onChange(date)}
            locale={nb}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {value && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Valgt dato</p>
          <p className="text-xl font-semibold">
            {format(value, 'd. MMMM yyyy', { locale: nb })}
          </p>
        </div>
      )}
    </div>
  );
}
