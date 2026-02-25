"use client";

import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { subtractWeeks } from "@/lib/calculator";

interface DueDateStepProps {
  value: Date;
  onChange: (date: Date) => void;
  prematureBirthDate: Date | null;
  onPrematureChange: (date: Date | null) => void;
}

export function DueDateStep({ value, onChange, prematureBirthDate, onPrematureChange }: DueDateStepProps) {
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

      {/* Prematur fødsel */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="premature-toggle" className="text-sm font-medium">
            Barnet ble født prematurt
          </Label>
          <p className="text-xs text-muted-foreground">
            Født mer enn 7 uker før termin? NAV utvider permisjonen tilsvarende.
          </p>
        </div>
        <Switch
          id="premature-toggle"
          checked={prematureBirthDate !== null}
          onCheckedChange={(checked) => onPrematureChange(checked ? subtractWeeks(value, 8) : null)}
        />
      </div>

      {prematureBirthDate !== null && (
        <div className="space-y-2">
          <Label className="text-sm">Faktisk fødselsdato</Label>
          <Calendar
            mode="single"
            selected={prematureBirthDate}
            onSelect={(date) => date && onPrematureChange(date)}
            locale={nb}
            captionLayout="dropdown"
            disabled={(date) => date >= subtractWeeks(value, 7)}
            className="rounded-md border w-full"
          />
        </div>
      )}
    </div>
  );
}
