'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage, ParentRights, JobSettings, LeaveResult } from '@/lib/types';
import { format, differenceInWeeks } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarDays, Users, Percent, Baby, Briefcase, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryStepProps {
  dueDate: Date;
  rights: ParentRights;
  coverage: Coverage;
  sharedWeeksToMother: number;
  daycareDate: Date | null;
  daycareEnabled: boolean;
  motherJobSettings: JobSettings | null;
  fatherJobSettings: JobSettings | null;
  leaveResult: LeaveResult;
  onGoBack: (step: number) => void;
  onComplete: () => void;
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  step: number;
  onEdit: (step: number) => void;
}

function SummaryRow({ icon, label, value, step, onEdit }: SummaryRowProps) {
  return (
    <button
      onClick={() => onEdit(step)}
      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 rounded-lg transition-colors text-left"
    >
      <div className="p-2 bg-muted rounded-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}

export function SummaryStep({
  dueDate,
  rights,
  coverage,
  sharedWeeksToMother,
  daycareDate,
  daycareEnabled,
  motherJobSettings,
  fatherJobSettings,
  leaveResult,
  onGoBack,
  onComplete,
}: SummaryStepProps) {
  const config = LEAVE_CONFIG[coverage];

  // Format rights label
  const rightsLabel =
    rights === 'both'
      ? 'Begge foreldre'
      : rights === 'mother-only'
      ? 'Kun mor'
      : 'Kun far/medmor';

  // Format distribution
  const sharedWeeksToFather = config.shared - sharedWeeksToMother;
  const distributionLabel =
    rights === 'both'
      ? `Mor ${sharedWeeksToMother} uker, far ${sharedWeeksToFather} uker fellesperiode`
      : 'Hele permisjonen til én forelder';

  // Calculate gap
  const gapWeeks = daycareEnabled && daycareDate
    ? Math.max(0, differenceInWeeks(daycareDate, leaveResult.father.end))
    : 0;

  // Job settings summary
  const hasJobSettings = motherJobSettings !== null || fatherJobSettings !== null;
  const jobLabel = hasJobSettings
    ? [
        motherJobSettings && `Mor: ${motherJobSettings.vacationDays} feriedager`,
        fatherJobSettings && `Far: ${fatherJobSettings.vacationDays} feriedager`,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Ikke angitt';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Oppsummering</h2>
        <p className="text-muted-foreground">
          Trykk på et felt for å gå tilbake og endre
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Dine valg</CardTitle>
          <CardDescription>Klikk for å redigere</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <div className="divide-y">
            <SummaryRow
              icon={<CalendarDays className="w-5 h-5" />}
              label="Termindato"
              value={format(dueDate, 'd. MMMM yyyy', { locale: nb })}
              step={1}
              onEdit={onGoBack}
            />
            <SummaryRow
              icon={<Users className="w-5 h-5" />}
              label="Rettigheter"
              value={rightsLabel}
              step={2}
              onEdit={onGoBack}
            />
            <SummaryRow
              icon={<Percent className="w-5 h-5" />}
              label="Dekningsgrad"
              value={`${coverage}% - ${config.total} uker`}
              step={3}
              onEdit={onGoBack}
            />
            <SummaryRow
              icon={<Users className="w-5 h-5" />}
              label="Fordeling"
              value={distributionLabel}
              step={4}
              onEdit={onGoBack}
            />
            <SummaryRow
              icon={<Baby className="w-5 h-5" />}
              label="Barnehagestart"
              value={
                daycareEnabled && daycareDate
                  ? format(daycareDate, 'd. MMMM yyyy', { locale: nb })
                  : 'Ikke angitt'
              }
              step={5}
              onEdit={onGoBack}
            />
            <SummaryRow
              icon={<Briefcase className="w-5 h-5" />}
              label="Jobbinnstillinger"
              value={jobLabel}
              step={6}
              onEdit={onGoBack}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gap warning */}
      {gapWeeks > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Gap på {gapWeeks} uker
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Du kan legge til ferie eller ulønnet permisjon i kalenderen for å dekke dette.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leave period summary */}
      <div className="grid grid-cols-2 gap-4">
        {rights !== 'father-only' && (
          <Card className={cn(
            'border-2',
            rights === 'both' ? 'border-pink-200 dark:border-pink-800' : ''
          )}>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Mor</p>
                <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                  {format(leaveResult.mother.start, 'd. MMM', { locale: nb })} -{' '}
                  {format(leaveResult.mother.end, 'd. MMM yyyy', { locale: nb })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {leaveResult.mother.weeks} uker
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {rights !== 'mother-only' && (
          <Card className={cn(
            'border-2',
            rights === 'both' ? 'border-blue-200 dark:border-blue-800' : '',
            rights === 'father-only' ? 'col-span-2' : ''
          )}>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Far</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {format(leaveResult.father.start, 'd. MMM', { locale: nb })} -{' '}
                  {format(leaveResult.father.end, 'd. MMM yyyy', { locale: nb })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {leaveResult.father.weeks} uker
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complete button */}
      <Button onClick={onComplete} size="lg" className="w-full">
        Gå til kalender
      </Button>
    </div>
  );
}
