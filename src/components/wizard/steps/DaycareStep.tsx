"use client";

import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { getDefaultDaycareStart, countWorkdaysInRange } from "@/lib/calculator";
import { nb } from "date-fns/locale";
import { formatWorkdays } from '@/lib/format';

interface DaycareStepProps {
  dueDate: Date;
  daycareDate: Date | null;
  daycareEnabled: boolean;
  leaveEndDate: Date;
  onDateChange: (date: Date | null) => void;
  onEnabledChange: (enabled: boolean) => void;
}

export function DaycareStep({
  dueDate,
  daycareDate,
  daycareEnabled,
  leaveEndDate,
  onDateChange,
  onEnabledChange,
}: DaycareStepProps) {
  // Beregner forventet barnehagestart basert på barnehageloven § 16
  const expectedDaycareStart = getDefaultDaycareStart(dueDate);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Barnehagestart</h2>
        <p className="text-muted-foreground">
          De fleste barnehager har hovedopptak 1. august
        </p>
      </div>

      {/* Enable/disable toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="daycare-toggle" className="text-sm font-medium">
            Ta med barnehagestart i beregningen
          </Label>
          <p className="text-xs text-muted-foreground">
            Viser eventuelt gap mellom permisjon og barnehage
          </p>
        </div>
        <Switch
          id="daycare-toggle"
          checked={daycareEnabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {daycareEnabled && (
        <>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={daycareDate ?? undefined}
              onSelect={(date) => onDateChange(date ?? null)}
              locale={nb}
              captionLayout="dropdown"
              defaultMonth={daycareDate ?? expectedDaycareStart}
              startMonth={dueDate}
              endMonth={new Date(dueDate.getFullYear() + 3, 11)}
              disabled={(date) => date < dueDate}
              className="rounded-md border w-full"
            />
          </div>

          {/* Summary with gap indicator */}
          {daycareDate &&
            (() => {
              // Gap i arbeidsdager, samme tall som i kalenderen og oppsummeringen
              const gapWorkDays = countWorkdaysInRange(leaveEndDate, daycareDate);
              return (
                <div className="space-y-3">
                  {/* Visual gap indicator */}
                  <div className="flex items-center gap-1 h-7">
                    <div className="h-full flex-1 rounded-l-sm bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                      Permisjon
                    </div>
                    {gapWorkDays > 0 ? (
                      <div className="h-full px-2 bg-warning-bg border border-dashed border-warning-fg/30 text-[10px] font-medium text-warning-fg flex items-center justify-center whitespace-nowrap">
                        {formatWorkdays(gapWorkDays)}
                      </div>
                    ) : null}
                    <div className="h-full flex-1 rounded-r-sm bg-success-bg text-[10px] font-medium text-success-fg flex items-center justify-center">
                      Barnehage
                    </div>
                  </div>

                  {/* Date labels */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Permisjon slutter
                      </p>
                      <p className="font-semibold text-sm">
                        {/* leaveEndDate er eksklusiv, UI viser siste permisjonsdag */}
                        {format(subDays(leaveEndDate, 1), "d. MMM yyyy", { locale: nb })}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Barnehage starter
                      </p>
                      <p className="font-semibold text-sm">
                        {format(daycareDate, "d. MMM yyyy", { locale: nb })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
