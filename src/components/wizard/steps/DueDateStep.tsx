"use client";

import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface DueDateStepProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DueDateStep({ value, onChange }: DueDateStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Når er termin?</h2>
        <p className="text-muted-foreground">
          Vi beregner permisjonen basert på termindato
        </p>
      </div>

      <Calendar
        mode="single"
        selected={value}
        onSelect={(date) => date && onChange(date)}
        locale={nb}
        captionLayout="dropdown"
        startMonth={new Date(new Date().getFullYear(), 0)}
        endMonth={new Date(new Date().getFullYear() + 2, 11)}
        className="rounded-md border w-full"
      />

      {value && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Valgt dato</p>
          <p className="text-xl font-semibold">
            {format(value, "d. MMMM yyyy", { locale: nb })}
          </p>
        </div>
      )}
    </div>
  );
}
