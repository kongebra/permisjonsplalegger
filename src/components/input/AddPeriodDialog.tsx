'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { countVacationDays, generatePeriodId, addDays } from '@/lib/calculator';
import type { Parent, LeavePeriod, LeavePeriodType, JobType } from '@/lib/types';

interface AddPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: Parent;
  jobType: JobType;
  onAdd: (period: LeavePeriod) => void;
  defaultStartDate?: Date;
}

const periodTypeOptions: { value: LeavePeriodType; label: string; description: string }[] = [
  { value: 'quota', label: 'Kvote', description: 'Mødre- eller fedrekvote' },
  { value: 'shared', label: 'Fellesperiode', description: 'Delt periode mellom foreldrene' },
  { value: 'vacation', label: 'Ferie', description: 'Feriedager (trekkes fra kvoten)' },
  { value: 'unpaid', label: 'Ulønnet permisjon', description: 'Permisjon uten lønn' },
];

export function AddPeriodDialog({
  open,
  onOpenChange,
  parent,
  jobType,
  onAdd,
  defaultStartDate,
}: AddPeriodDialogProps) {
  const [periodType, setPeriodType] = useState<LeavePeriodType>('quota');
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Calculate vacation days when dates change
  const vacationDaysUsed = useMemo(() => {
    if (periodType !== 'vacation' || !startDate || !endDate) {
      return undefined;
    }
    // endDate here is the selected "last day" - need to add 1 for exclusive end
    return countVacationDays(startDate, addDays(endDate, 1), jobType);
  }, [periodType, startDate, endDate, jobType]);

  const handleAdd = () => {
    if (!startDate || !endDate) return;

    const period: LeavePeriod = {
      id: generatePeriodId(),
      parent,
      type: periodType,
      startDate,
      endDate: addDays(endDate, 1), // Convert to exclusive end date
      vacationDaysUsed: periodType === 'vacation' ? vacationDaysUsed : undefined,
    };

    onAdd(period);
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setPeriodType('quota');
    setStartDate(defaultStartDate);
    setEndDate(undefined);
    onOpenChange(false);
  };

  const isValid = startDate && endDate && endDate >= startDate;
  const parentLabel = parent === 'mother' ? 'mor' : 'far';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Legg til periode for {parentLabel}</DialogTitle>
          <DialogDescription>
            Velg type og datoer for perioden.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Period type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={periodType}
              onValueChange={(value) => setPeriodType(value as LeavePeriodType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label>Fra dato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: nb }) : 'Velg dato'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={nb}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End date */}
          <div className="space-y-2">
            <Label>Til dato (inklusiv)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP', { locale: nb }) : 'Velg dato'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => (startDate ? date < startDate : false)}
                  locale={nb}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Vacation days preview */}
          {periodType === 'vacation' && startDate && endDate && (
            <div className="rounded-lg border bg-warning-bg p-3">
              <p className="text-sm">
                <span className="font-medium">Feriedager brukt:</span>{' '}
                {vacationDaysUsed !== undefined ? vacationDaysUsed : '...'}{' '}
                {jobType === 'office' ? '(man-fre, uten helligdager)' : '(man-lør)'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Avbryt
          </Button>
          <Button onClick={handleAdd} disabled={!isValid}>
            Legg til
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
