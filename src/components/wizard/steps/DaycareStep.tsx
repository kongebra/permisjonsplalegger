'use client';

import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, differenceInWeeks } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';

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
  // Calculate gap
  const gapWeeks = daycareEnabled && daycareDate
    ? Math.max(0, differenceInWeeks(daycareDate, leaveEndDate))
    : 0;

  const hasGap = gapWeeks > 0;

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
                disabled={(date) => date < dueDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Gap warning */}
          {hasGap && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    Gap på {gapWeeks} uker
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Det blir et gap mellom permisjonen slutter og barnehagen starter.
                    Dette kan dekkes med ferie, ulønnet permisjon, eller annen dekning.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {daycareDate && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Permisjon slutter</p>
                <p className="font-semibold">
                  {format(leaveEndDate, 'd. MMM yyyy', { locale: nb })}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Barnehage starter</p>
                <p className="font-semibold">
                  {format(daycareDate, 'd. MMM yyyy', { locale: nb })}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
