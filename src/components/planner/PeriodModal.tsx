'use client';

import { useState } from 'react';
import { format, differenceInDays, differenceInBusinessDays, addDays } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CustomPeriod, PlannerPeriodType, Parent, ParentRights, LeaveResult } from '@/lib/types';
import { CalendarDays, Trash2 } from 'lucide-react';

interface PeriodModalProps {
  open: boolean;
  period: CustomPeriod | null;
  rights: ParentRights;
  leaveResult?: LeaveResult;
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
const ANNET_PALETTE = [
  '#9333ea', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48', // rose
  '#8b5cf6', // violet-light
  '#0ea5e9', // sky
];

type Placement = 'after-mother' | 'before-father' | 'overlap-father' | 'custom';

function PeriodModalContent({
  period,
  rights,
  leaveResult,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: Omit<PeriodModalProps, 'open'>) {
  const isEditing = period !== null;
  const isLocked = period?.isLocked === true;

  // Reference dates from leave result
  const motherEnd = leaveResult?.mother.end;
  const fatherStart = leaveResult?.father.start;

  const [type, setType] = useState<PlannerPeriodType>(period?.type ?? 'ferie');
  const [parent, setParent] = useState<Parent>(
    period?.parent ?? (rights === 'father-only' ? 'father' : 'mother'),
  );
  const [startDate, setStartDate] = useState<Date>(
    period?.startDate ?? motherEnd ?? new Date(),
  );
  const [endDate, setEndDate] = useState<Date>(
    period?.endDate ?? addDays(motherEnd ?? new Date(), 14),
  );
  const [label, setLabel] = useState(period?.label ?? '');
  const [color, setColor] = useState(period?.color ?? '#9333ea');
  const [placement, setPlacement] = useState<Placement>(isEditing ? 'custom' : 'after-mother');

  // Apply placement presets
  const applyPlacement = (p: Placement) => {
    setPlacement(p);
    const duration = Math.max(1, differenceInDays(endDate, startDate));

    switch (p) {
      case 'after-mother':
        if (motherEnd) {
          setStartDate(motherEnd);
          setEndDate(addDays(motherEnd, duration));
        }
        break;
      case 'before-father':
        if (fatherStart) {
          setEndDate(fatherStart);
          setStartDate(addDays(fatherStart, -duration));
        }
        break;
      case 'overlap-father':
        if (fatherStart) {
          setEndDate(fatherStart);
          setStartDate(addDays(fatherStart, -duration));
        }
        break;
      case 'custom':
        break;
    }
  };

  // Day count
  const calendarDays = differenceInDays(endDate, startDate);
  const workDays = calendarDays > 0 ? differenceInBusinessDays(endDate, startDate) : 0;

  const handleSave = () => {
    const periodData = {
      type,
      parent,
      startDate,
      endDate,
      label: type === 'annet' ? label : undefined,
      color: type === 'annet' ? color : undefined,
    };

    if (isEditing && period) {
      onUpdate(period.id, periodData);
    } else {
      onSave(periodData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (period) {
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

      <div className="space-y-4 py-4">
        {/* Period type */}
        {!isLocked && (
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors border',
                    type === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:bg-muted/50',
                  )}
                >
                  {PERIOD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Locked period info */}
        {isLocked && period && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium">{period.segmentType === 'preBirth' ? 'Før termin' : 'Obligatorisk etter fødsel'}</p>
            <p>
              {format(period.startDate, 'd. MMM yyyy', { locale: nb })} –{' '}
              {format(addDays(period.endDate, -1), 'd. MMM yyyy', { locale: nb })}
            </p>
          </div>
        )}

        {/* Parent */}
        {!isLocked && showMother && showFather && (
          <div className="space-y-2">
            <Label>Forelder</Label>
            <div className="flex gap-2">
              {showMother && (
                <button
                  onClick={() => setParent('mother')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm transition-colors',
                    parent === 'mother'
                      ? 'bg-pink-500 text-white'
                      : 'bg-pink-100 text-pink-700 hover:bg-pink-200',
                  )}
                >
                  Mor
                </button>
              )}
              {showFather && (
                <button
                  onClick={() => setParent('father')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm transition-colors',
                    parent === 'father'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                  )}
                >
                  Far
                </button>
              )}
            </div>
          </div>
        )}

        {/* Placement presets (only for new periods) */}
        {!isEditing && !isLocked && (motherEnd || fatherStart) && (
          <div className="space-y-2">
            <Label>Plassering</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {motherEnd && (
                <button
                  onClick={() => applyPlacement('after-mother')}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm text-left transition-colors border',
                    placement === 'after-mother'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:bg-muted/50',
                  )}
                >
                  Etter mors permisjon
                </button>
              )}
              {fatherStart && (
                <button
                  onClick={() => applyPlacement('before-father')}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm text-left transition-colors border',
                    placement === 'before-father'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:bg-muted/50',
                  )}
                >
                  Før fars permisjon
                </button>
              )}
              {fatherStart && (
                <button
                  onClick={() => applyPlacement('overlap-father')}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm text-left transition-colors border',
                    placement === 'overlap-father'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:bg-muted/50',
                  )}
                >
                  Overlapp med fars permisjon
                </button>
              )}
              <button
                onClick={() => applyPlacement('custom')}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm text-left transition-colors border',
                  placement === 'custom'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:bg-muted/50',
                )}
              >
                Egendefinerte datoer
              </button>
            </div>
          </div>
        )}

        {/* Dates */}
        {!isLocked && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fra</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(startDate, 'd. MMM yyyy', { locale: nb })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      defaultMonth={startDate}
                      onSelect={(d) => {
                        if (d) {
                          setStartDate(d);
                          setPlacement('custom');
                        }
                      }}
                      locale={nb}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Til</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(addDays(endDate, -1), 'd. MMM yyyy', { locale: nb })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={addDays(endDate, -1)}
                      defaultMonth={addDays(endDate, -1)}
                      onSelect={(d) => {
                        if (d) {
                          setEndDate(addDays(d, 1));
                          setPlacement('custom');
                        }
                      }}
                      locale={nb}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Day count */}
            {calendarDays > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {calendarDays} kalenderdager ({workDays} virkedager)
              </p>
            )}
          </div>
        )}

        {/* Custom label and color for 'annet' type */}
        {type === 'annet' && !isLocked && (
          <>
            <div className="space-y-2">
              <Label htmlFor="label">Beskrivelse</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="F.eks. Bestemor passer, Dagmamma"
              />
            </div>

            <div className="space-y-2">
              <Label>Farge</Label>
              <div className="flex flex-wrap gap-2">
                {ANNET_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      color === c
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Velg farge ${c}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="flex justify-between sm:justify-between">
        {isEditing && !isLocked && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
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
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: PeriodModalProps) {
  const contentKey = period?.id ?? 'new-period';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <PeriodModalContent
          key={contentKey}
          period={period}
          rights={rights}
          leaveResult={leaveResult}
          onClose={onClose}
          onSave={onSave}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
