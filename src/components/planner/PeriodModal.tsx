'use client';

import { useId, useState, useMemo } from 'react';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartPeriodPicker, buildPickerEvents, buildIconMarkers } from '@/components/picker';
import { getHolidayMap } from '@/lib/holidays';
import { countVacationDays } from '@/lib/calculator/dates';
import { getVacationLeaveOverlap } from '@/lib/calculator/planner-income';
import {
  formatPlacementRange,
  getDefaultPlacementId,
  getPlacementHint,
  getPlacementOptions,
  getPlacementQuestion,
  type PlacementId,
} from '@/lib/calculator/placements';
import { usePlannerStore } from '@/store';
import { cn } from '@/lib/utils';
import type { CustomPeriod, PlannerPeriodType, Parent, ParentRights, LeaveResult } from '@/lib/types';
import { CalendarDays, Trash2 } from 'lucide-react';
import posthog from 'posthog-js';

interface PeriodModalProps {
  open: boolean;
  period: CustomPeriod | null;
  rights: ParentRights;
  leaveResult?: LeaveResult;
  customPeriods?: CustomPeriod[];
  dueDate?: Date;
  daycareStart?: Date | null;
  onClose: () => void;
  onSave: (period: Omit<CustomPeriod, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<CustomPeriod>) => void;
  onDelete: (id: string) => void;
}

const PERIOD_TYPE_LABELS: Record<PlannerPeriodType, string> = {
  permisjon: 'Permisjon',
  ferie: 'Ferie',
  ulonnet: 'Ulønnet permisjon',
  annet: 'Annet',
};

// Predefined color palette for "Annet" periods.
// Excludes pink (mor), blue (far), violet (termin), emerald (barnehagestart).
// Hver farge har et navn, siden skjermleser og talestyring ikke kan bruke hex.
const ANNET_PALETTE = [
  { value: '#9333ea', name: 'lilla' },
  { value: '#f59e0b', name: 'gul' },
  { value: '#06b6d4', name: 'turkis' },
  { value: '#84cc16', name: 'limegrønn' },
  { value: '#f97316', name: 'oransje' },
  { value: '#6366f1', name: 'indigo' },
  { value: '#14b8a6', name: 'blågrønn' },
  { value: '#e11d48', name: 'rød' },
  { value: '#8b5cf6', name: 'fiolett' },
  { value: '#0ea5e9', name: 'lyseblå' },
];

interface ChoiceItem<T extends string> {
  id: T;
  label: string;
  /** Tekst under navnet, knyttet til valget med aria-describedby */
  description?: string | null;
}

/**
 * Gjensidig utelukkende valg: fieldset + legend + native radioknapper, slik at
 * piltaster flytter valget og skjermleseren leser gruppenavn og posisjon.
 * Hele raden er klikkflate (minst 44 px).
 */
function ChoiceGroup<T extends string>({
  legend,
  value,
  items,
  onChange,
  columns = 1,
  hint,
}: {
  legend: string;
  value: T;
  items: ChoiceItem<T>[];
  onChange: (id: T) => void;
  columns?: 1 | 2;
  hint?: string | null;
}) {
  const groupId = useId();
  const legendId = `${groupId}-legend`;
  const hintId = `${groupId}-hint`;

  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={legendId}
      aria-describedby={hint ? hintId : undefined}
      className="min-w-0 space-y-2"
    >
      <legend id={legendId} className="mb-2 text-sm leading-none font-medium">
        {legend}
      </legend>
      <div className={cn('grid gap-2', columns === 2 && 'grid-cols-2')}>
        {items.map((item) => {
          const nameId = `${groupId}-${item.id}-name`;
          const descriptionId = `${groupId}-${item.id}-description`;
          return (
            <label
              key={item.id}
              className={cn(
                'flex min-h-11 cursor-pointer gap-3 rounded-lg border border-input px-3 py-2.5 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                item.description ? 'items-start' : 'items-center',
              )}
            >
              <input
                type="radio"
                name={groupId}
                value={item.id}
                checked={value === item.id}
                onChange={() => onChange(item.id)}
                aria-labelledby={nameId}
                aria-describedby={item.description ? descriptionId : undefined}
                className={cn(
                  'size-4 shrink-0 accent-primary focus-visible:outline-none',
                  item.description && 'mt-0.5',
                )}
              />
              <span className="min-w-0">
                <span id={nameId} className="block text-sm leading-snug font-medium">
                  {item.label}
                </span>
                {item.description && (
                  <span
                    id={descriptionId}
                    className="mt-0.5 block text-sm leading-snug text-muted-foreground"
                  >
                    {item.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </fieldset>
  );
}

function PeriodModalContent({
  period,
  rights,
  leaveResult,
  customPeriods: allPeriods,
  dueDate: dueDateProp,
  daycareStart: daycareStartProp,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: Omit<PeriodModalProps, 'open'>) {
  const isEditing = period !== null;
  const isLocked = period?.isLocked === true;
  const fieldId = useId();

  // Ny periode starter der permisjonen slutter
  const defaultStart = leaveResult?.mother.weeks
    ? leaveResult.mother.end
    : (leaveResult?.father.end ?? new Date());

  const [type, setType] = useState<PlannerPeriodType>(period?.type ?? 'ferie');
  const [parent, setParent] = useState<Parent>(
    period?.parent ?? (rights === 'father-only' ? 'father' : 'mother'),
  );
  // Egne datoer: gjelder ved redigering og når brukeren velger datoene selv
  const [customStart, setCustomStart] = useState<Date>(period?.startDate ?? defaultStart);
  const [customEnd, setCustomEnd] = useState<Date>(period?.endDate ?? addDays(defaultStart, 14));
  // Lengden på perioden beholdes når brukeren bytter plassering
  const [durationDays, setDurationDays] = useState(14);
  const [placementId, setPlacementId] = useState<PlacementId>('after');
  // Hva som sist endret seg, slik at live-regionen bare annonserer etter en handling
  const [lastChange, setLastChange] = useState<'parent' | 'other' | null>(null);
  const [label, setLabel] = useState(period?.label ?? '');
  const [color, setColor] = useState(period?.color ?? '#9333ea');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const motherJobSettings = usePlannerStore((s) => s.motherJobSettings);
  const fatherJobSettings = usePlannerStore((s) => s.fatherJobSettings);
  const jobSettings = parent === 'mother' ? motherJobSettings : fatherJobSettings;
  const jobType = jobSettings?.jobType ?? 'office';

  const showPlacements = !isEditing && !isLocked;
  const placementOptions = useMemo(
    () =>
      getPlacementOptions({
        rights,
        parent,
        type,
        leaveResult,
        daycareStart: daycareStartProp,
        durationDays,
      }),
    [rights, parent, type, leaveResult, daycareStartProp, durationDays],
  );
  // Valget som ikke lenger finnes (f.eks. «I permisjonen» for Annet) faller tilbake til standard
  const selectedOption =
    placementOptions.find((o) => o.id === placementId) ??
    placementOptions.find((o) => o.id === getDefaultPlacementId(placementOptions));
  const effectivePlacementId = showPlacements ? (selectedOption?.id ?? 'custom') : 'custom';

  // Datoene regnes ut her, slik at de alltid følger valgt forelder, type og permisjon
  const startDate = (showPlacements && selectedOption?.start) || customStart;
  const endDate = (showPlacements && selectedOption?.end) || customEnd;

  // Build SmartPeriodPicker data
  const pickerEvents = useMemo(() => {
    const segments = leaveResult?.segments ?? [];
    const periods = allPeriods ?? [];
    return buildPickerEvents(segments, periods, isEditing ? period?.id : undefined);
  }, [leaveResult, allPeriods, isEditing, period?.id]);

  const iconMarkers = useMemo(() => {
    if (!dueDateProp) return undefined;
    return buildIconMarkers(dueDateProp, daycareStartProp ?? undefined);
  }, [dueDateProp, daycareStartProp]);

  const holidayMap = useMemo(() => {
    // Build holiday map spanning a wide range around the relevant dates
    const earliest = dueDateProp ?? new Date();
    const rangeStart = new Date(earliest.getFullYear() - 3, 0, 1);
    const rangeEnd = new Date(earliest.getFullYear() + 4, 11, 31);
    return getHolidayMap(rangeStart, rangeEnd);
  }, [dueDateProp]);

  // Day count
  const calendarDays = differenceInDays(endDate, startDate);
  const workDays = calendarDays > 0 ? countVacationDays(startDate, endDate, jobType) : 0;

  // Ferie over egen permisjon: forklar hva planen regner med
  const leaveOverlap =
    type === 'ferie' && calendarDays > 0
      ? getVacationLeaveOverlap(allPeriods ?? [], parent, startDate, endDate, period?.id)
      : 'none';

  const handlePlacementChange = (id: PlacementId) => {
    // Perioden beholder lengden, og «Velg datoer selv» starter med datoene som vises nå
    if (calendarDays > 0) setDurationDays(calendarDays);
    if (id === 'custom') {
      setCustomStart(startDate);
      setCustomEnd(endDate);
    }
    setPlacementId(id);
    setLastChange('other');
  };

  const handleTypeChange = (next: PlannerPeriodType) => {
    const nextOptions = getPlacementOptions({
      rights,
      parent,
      type: next,
      leaveResult,
      daycareStart: daycareStartProp,
      durationDays,
    });
    // Et valg som ikke finnes for den nye typen (f.eks. «I permisjonen» for Annet)
    // erstattes av standard, og kommer ikke tilbake når brukeren bytter tilbake
    if (!nextOptions.some((o) => o.id === effectivePlacementId)) {
      if (calendarDays > 0) setDurationDays(calendarDays);
      setPlacementId(getDefaultPlacementId(nextOptions));
    }
    setType(next);
    setLastChange('other');
  };

  const handleParentChange = (next: Parent) => {
    if (next === parent) return;
    if (calendarDays > 0) setDurationDays(calendarDays);
    // Valgene er ulike per forelder: velg standard på nytt, og datoene regnes ut på nytt
    setParent(next);
    setPlacementId(
      getDefaultPlacementId(
        getPlacementOptions({
          rights,
          parent: next,
          type,
          leaveResult,
          daycareStart: daycareStartProp,
          durationDays,
        }),
      ),
    );
    setLastChange('parent');
  };

  const handleSave = () => {
    const periodData = {
      type,
      parent,
      startDate,
      endDate,
      label: type === 'annet' ? label : undefined,
      color: type === 'annet' ? color : undefined,
      vacationDaysUsed: type === 'ferie' ? workDays : undefined,
    };

    if (isEditing && period) {
      posthog.capture('period_updated', {
        period_type: type,
        parent,
        duration_days: calendarDays,
      });
      onUpdate(period.id, periodData);
    } else {
      posthog.capture('period_created', {
        period_type: type,
        parent,
        duration_days: calendarDays,
        placement: effectivePlacementId,
      });
      onSave(periodData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (period) {
      posthog.capture('period_deleted', {
        period_type: period.type,
        parent: period.parent,
      });
      onDelete(period.id);
      onClose();
    }
  };

  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  // Filter out permisjon for new periods (only wizard creates those)
  const availableTypes = isEditing
    ? (Object.keys(PERIOD_TYPE_LABELS) as PlannerPeriodType[])
    : (Object.keys(PERIOD_TYPE_LABELS) as PlannerPeriodType[]).filter((t) => t !== 'permisjon');

  // Fra og Til vises bare når datoene ikke står på valgene
  const showDateButtons = !isLocked && effectivePlacementId === 'custom';

  // Én kort setning i live-regionen. Detaljene står som vanlig tekst i dialogen.
  const rangeText = calendarDays > 0 ? formatPlacementRange(startDate, endDate) : '';
  const announcement = (() => {
    if (!lastChange || !rangeText) return '';
    const summary = `${PERIOD_TYPE_LABELS[type]} ${rangeText}.`;
    const note =
      leaveOverlap === 'leave'
        ? ' Ligger i permisjonen.'
        : leaveOverlap === 'mandatory'
          ? ' Ligger i de første seks ukene etter fødselen.'
          : '';
    return lastChange === 'parent'
      ? `Valgene gjelder nå ${parent === 'mother' ? 'mor' : 'far'}. ${summary}${note}`
      : `${summary}${note}`;
  })();

  const fromLabelId = `${fieldId}-from-label`;
  const fromValueId = `${fieldId}-from-value`;
  const toLabelId = `${fieldId}-to-label`;
  const toValueId = `${fieldId}-to-value`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isLocked ? 'Låst periode' : isEditing ? 'Rediger periode' : 'Ny periode'}
        </DialogTitle>
        <DialogDescription>
          {isLocked
            ? 'Denne perioden er obligatorisk og kan ikke endres'
            : isEditing
              ? 'Endre detaljer for denne perioden'
              : 'Legg til ferie, ulønnet permisjon, eller annet'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* Period type */}
        {!isLocked && (
          <ChoiceGroup
            legend="Type"
            columns={2}
            value={type}
            onChange={handleTypeChange}
            items={availableTypes.map((t) => ({ id: t, label: PERIOD_TYPE_LABELS[t] }))}
          />
        )}

        {/* Locked period info */}
        {isLocked && period && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium">{period.segmentType === 'preBirth' ? 'Før termin' : 'Obligatorisk etter fødsel'}</p>
            <p>{formatPlacementRange(period.startDate, period.endDate)}</p>
          </div>
        )}

        {/* Parent */}
        {!isLocked && showMother && showFather && (
          <ChoiceGroup
            legend="Forelder"
            columns={2}
            value={parent}
            onChange={handleParentChange}
            items={[
              { id: 'mother', label: 'Mor' },
              { id: 'father', label: 'Far' },
            ]}
          />
        )}

        {/* Placement (only for new periods) */}
        {showPlacements && leaveResult && (
          <ChoiceGroup
            legend={getPlacementQuestion(parent, type)}
            value={effectivePlacementId}
            onChange={handlePlacementChange}
            items={placementOptions}
            hint={getPlacementHint(rights, parent)}
          />
        )}

        {/* Dates */}
        {!isLocked && (
          <div className="space-y-3">
            {/* Fra / Til buttons */}
            {showDateButtons && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label id={fromLabelId} htmlFor={`${fieldId}-from`}>Fra</Label>
                  <Button
                    id={`${fieldId}-from`}
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    aria-labelledby={`${fromLabelId} ${fromValueId}`}
                    onClick={() => setCalendarOpen(true)}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span id={fromValueId}>{format(startDate, 'd. MMM yyyy', { locale: nb })}</span>
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label id={toLabelId} htmlFor={`${fieldId}-to`}>Til</Label>
                  <Button
                    id={`${fieldId}-to`}
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    aria-labelledby={`${toLabelId} ${toValueId}`}
                    onClick={() => setCalendarOpen(true)}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span id={toValueId}>{format(subDays(endDate, 1), 'd. MMM yyyy', { locale: nb })}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Valgt periode, med datoer også når Fra og Til er skjult */}
            {calendarDays > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                <span className="block">{rangeText}</span>
                <span className="block">
                  {calendarDays === 1 ? '1 kalenderdag' : `${calendarDays} kalenderdager`}
                  {type === 'ferie' && ` (${workDays === 1 ? '1 feriedag' : `${workDays} feriedager`})`}
                </span>
              </p>
            )}

            {leaveOverlap === 'leave' && (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                Ferien ligger i permisjonen din. Planen regner med at du får foreldrepenger og
                feriepenger samtidig, og at du bruker feriedager. Vil du heller sette
                foreldrepengene på pause, flytt eller kort ned permisjonen så ferien ligger utenfor.
              </p>
            )}
            {leaveOverlap === 'mandatory' && (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                De første seks ukene etter fødselen kan ikke kombineres med ferie. Disse dagene
                regnes bare som foreldrepenger.
              </p>
            )}

            {/* Smart period picker (replaces DatePickerOverlay) */}
            {calendarOpen && (
              <SmartPeriodPicker
                startDate={startDate}
                endDate={endDate}
                onSelectionChange={() => {}}
                onConfirm={(start, end) => {
                  setCustomStart(start);
                  setCustomEnd(end);
                  setPlacementId('custom');
                  setLastChange('other');
                  setCalendarOpen(false);
                }}
                onClose={() => setCalendarOpen(false)}
                events={pickerEvents}
                iconMarkers={iconMarkers}
                holidayMap={holidayMap}
                initialScrollDate={startDate}
                jobType={jobType}
              />
            )}
          </div>
        )}

        {/* Custom label and color for 'annet' type */}
        {type === 'annet' && !isLocked && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-label`}>Beskrivelse</Label>
              <Input
                id={`${fieldId}-label`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="F.eks. Bestemor passer, Dagmamma"
              />
            </div>

            <fieldset role="radiogroup" aria-labelledby={`${fieldId}-color-legend`} className="min-w-0 space-y-2">
              <legend id={`${fieldId}-color-legend`} className="mb-2 text-sm leading-none font-medium">Farge</legend>
              <div className="grid grid-cols-5 sm:grid-cols-10">
                {ANNET_PALETTE.map((c) => (
                  <label
                    key={c.value}
                    className="relative flex h-11 cursor-pointer items-center justify-center"
                  >
                    <input
                      type="radio"
                      name={`${fieldId}-color`}
                      value={c.value}
                      checked={color === c.value}
                      onChange={() => setColor(c.value)}
                      className="peer sr-only"
                    />
                    <span className="sr-only">{c.name}</span>
                    <span
                      aria-hidden="true"
                      className="size-8 rounded-full transition-transform peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-primary peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
                      style={{ backgroundColor: c.value }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {/* Én live-region for hele dialogen, slik at bare én melding leses opp om gangen */}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </p>
      </div>

      <DialogFooter className="flex justify-between sm:justify-between">
        {isEditing && !isLocked && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Slett
          </Button>
        )}
        <div className={cn('flex gap-2', (!isEditing || isLocked) && 'ml-auto')}>
          <Button variant="outline" onClick={onClose}>
            {isLocked ? 'Lukk' : 'Avbryt'}
          </Button>
          {!isLocked && (
            <Button onClick={handleSave} disabled={calendarDays <= 0}>
              {isEditing ? 'Oppdater' : 'Legg til'}
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

export function PeriodModal({
  open,
  period,
  rights,
  leaveResult,
  customPeriods,
  dueDate,
  daycareStart,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: PeriodModalProps) {
  const contentKey = period?.id ?? 'new-period';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <PeriodModalContent
          key={contentKey}
          period={period}
          rights={rights}
          leaveResult={leaveResult}
          customPeriods={customPeriods}
          dueDate={dueDate}
          daycareStart={daycareStart}
          onClose={onClose}
          onSave={onSave}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
