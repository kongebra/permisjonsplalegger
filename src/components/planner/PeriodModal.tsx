'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import type { CustomPeriod, PlannerPeriodType, Parent, ParentRights } from '@/lib/types';
import { CalendarDays, Trash2 } from 'lucide-react';

interface PeriodModalProps {
  open: boolean;
  period: CustomPeriod | null;
  rights: ParentRights;
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

// Inner component that handles state - re-mounts when period changes
function PeriodModalContent({
  period,
  rights,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: Omit<PeriodModalProps, 'open'>) {
  const isEditing = period !== null;

  // Initialize state from period or defaults
  const [type, setType] = useState<PlannerPeriodType>(period?.type ?? 'permisjon');
  const [parent, setParent] = useState<Parent>(
    period?.parent ?? (rights === 'father-only' ? 'father' : 'mother')
  );
  const [startDate, setStartDate] = useState<Date>(period?.startDate ?? new Date());
  const [endDate, setEndDate] = useState<Date>(period?.endDate ?? new Date());
  const [label, setLabel] = useState(period?.label ?? '');
  const [color, setColor] = useState(period?.color ?? '#9333ea');

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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Rediger periode' : 'Ny periode'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Endre detaljer for denne perioden'
            : 'Legg til en ny periode i kalenderen'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Period type */}
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PERIOD_TYPE_LABELS) as PlannerPeriodType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-colors border',
                  type === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:bg-muted/50'
                )}
              >
                {PERIOD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Parent */}
        {showMother && showFather && (
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
                      : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
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
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  )}
                >
                  Far
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Startdato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(startDate, 'd. MMM', { locale: nb })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  locale={nb}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Sluttdato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(endDate, 'd. MMM', { locale: nb })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  locale={nb}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Custom label and color for 'annet' type */}
        {type === 'annet' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="label">Beskrivelse</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="F.eks. Bestemor passer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Farge</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="flex justify-between sm:justify-between">
        {isEditing && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Slett
          </Button>
        )}
        <div className={cn('flex gap-2', !isEditing && 'ml-auto')}>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Oppdater' : 'Legg til'}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function PeriodModal({
  open,
  period,
  rights,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: PeriodModalProps) {
  // Create a key that changes when period changes to force re-mount
  const contentKey = period?.id ?? 'new-period';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <PeriodModalContent
          key={contentKey}
          period={period}
          rights={rights}
          onClose={onClose}
          onSave={onSave}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
