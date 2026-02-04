'use client';

import { cn } from '@/lib/utils';
import type { PlannerPeriodType, Parent, ParentRights } from '@/lib/types';
import { CalendarDays, Palmtree, Clock, MoreHorizontal } from 'lucide-react';

interface PeriodToolbarProps {
  selectedType: PlannerPeriodType;
  selectedParent: Parent;
  rights: ParentRights;
  onTypeChange: (type: PlannerPeriodType) => void;
  onParentChange: (parent: Parent) => void;
}

const PERIOD_TYPES: {
  value: PlannerPeriodType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'permisjon',
    label: 'Permisjon',
    shortLabel: 'Perm',
    icon: <CalendarDays className="w-4 h-4" />,
  },
  {
    value: 'ferie',
    label: 'Ferie',
    shortLabel: 'Ferie',
    icon: <Palmtree className="w-4 h-4" />,
  },
  {
    value: 'ulonnet',
    label: 'Ulønnet',
    shortLabel: 'Ulønnet',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: 'annet',
    label: 'Annet',
    shortLabel: 'Annet',
    icon: <MoreHorizontal className="w-4 h-4" />,
  },
];

export function PeriodToolbar({
  selectedType,
  selectedParent,
  rights,
  onTypeChange,
  onParentChange,
}: PeriodToolbarProps) {
  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';
  const showParentToggle = showMother && showFather;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="container mx-auto px-4 py-3 space-y-3">
        {/* Period type selection */}
        <div className="flex gap-1 justify-center">
          {PERIOD_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onTypeChange(type.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                selectedType === type.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {type.icon}
              <span className="hidden sm:inline">{type.label}</span>
              <span className="sm:hidden">{type.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Parent selection */}
        {showParentToggle && (
          <div className="flex justify-center gap-2">
            {showMother && (
              <button
                onClick={() => onParentChange('mother')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
                  selectedParent === 'mother'
                    ? 'bg-pink-500 text-white'
                    : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                )}
              >
                Mor
              </button>
            )}
            {showFather && (
              <button
                onClick={() => onParentChange('father')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  selectedParent === 'father'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                )}
              >
                Far
              </button>
            )}
          </div>
        )}

        {/* Instructions */}
        <p className="text-center text-xs text-muted-foreground">
          Trykk på startdato, deretter sluttdato
        </p>
      </div>
    </div>
  );
}
