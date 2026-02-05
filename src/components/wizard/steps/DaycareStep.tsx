"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

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
  // Calculate expected daycare start (August 1st intake)
  const expectedDaycareStart = (() => {
    const year = dueDate.getFullYear();
    const augustFirstSameYear = new Date(year, 7, 1);
    if (dueDate >= augustFirstSameYear) {
      return new Date(year + 2, 7, 1); // Born after Aug → daycare 2 years later
    }
    return new Date(year + 1, 7, 1); // Born before Aug → daycare 1 year later
  })();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Barnehagestart</h2>
        <p className="text-muted-foreground">
          De fleste barnehager har hovedopptak 1. august
        </p>
      </div>

      {/* Enable/disable toggle */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="daycare-toggle" className="text-base font-medium">
                Ta med barnehagestart i beregningen
              </Label>
              <p className="text-sm text-muted-foreground">
                Viser eventuelt gap mellom permisjon og barnehage
              </p>
            </div>
            <Switch
              id="daycare-toggle"
              checked={daycareEnabled}
              onCheckedChange={onEnabledChange}
            />
          </div>
        </CardContent>
      </Card>

      {daycareEnabled && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Planlagt barnehagestart</CardTitle>
              <CardDescription>
                Velg når barnet skal starte i barnehage
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
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
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Summary */}
          {daycareDate && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Permisjon slutter
                </p>
                <p className="font-semibold">
                  {format(leaveEndDate, "d. MMM yyyy", { locale: nb })}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Barnehage starter
                </p>
                <p className="font-semibold">
                  {format(daycareDate, "d. MMM yyyy", { locale: nb })}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
