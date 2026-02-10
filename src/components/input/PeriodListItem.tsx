'use client';

import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Trash2, Calendar, Briefcase, Umbrella, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeavePeriod, LeavePeriodType } from '@/lib/types';
import { addDays } from '@/lib/calculator/dates';

interface PeriodListItemProps {
  period: LeavePeriod;
  onDelete: (id: string) => void;
}

const typeConfig: Record<
  LeavePeriodType,
  { label: string; icon: React.ReactNode; className: string }
> = {
  quota: {
    label: 'Kvote',
    icon: <Briefcase className="h-4 w-4" />,
    className: 'bg-success-bg text-success-fg',
  },
  shared: {
    label: 'Fellesperiode',
    icon: <Calendar className="h-4 w-4" />,
    className: 'bg-shared-light text-shared',
  },
  vacation: {
    label: 'Ferie',
    icon: <Umbrella className="h-4 w-4" />,
    className: 'bg-warning-bg text-warning-fg',
  },
  unpaid: {
    label: 'Ulønnet',
    icon: <Clock className="h-4 w-4" />,
    className: 'bg-unpaid text-muted-foreground',
  },
};

export function PeriodListItem({ period, onDelete }: PeriodListItemProps) {
  const config = typeConfig[period.type];
  // Display end date inclusively (subtract 1 day since endDate is exclusive)
  const displayEndDate = addDays(period.endDate, -1);

  const formatDate = (date: Date) => format(date, 'd. MMM yyyy', { locale: nb });

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {/* Type badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          config.className
        )}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>

      {/* Date range */}
      <div className="flex-1 text-sm">
        <span className="font-medium">{formatDate(period.startDate)}</span>
        <span className="mx-2 text-muted-foreground">-</span>
        <span className="font-medium">{formatDate(displayEndDate)}</span>
      </div>

      {/* Vacation days used (only for vacation type) */}
      {period.type === 'vacation' && period.vacationDaysUsed !== undefined && (
        <div className="text-sm text-muted-foreground">
          {period.vacationDaysUsed} feriedager
        </div>
      )}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(period.id)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Slett periode</span>
      </Button>
    </div>
  );
}
