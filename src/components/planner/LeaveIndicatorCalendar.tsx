'use client';

import { createContext, useContext, useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { DayPicker, type DayButton } from 'react-day-picker';

import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import type { LeaveSegment, LeaveSegmentType, Parent } from '@/lib/types';

// --- Types ---

type IndicatorCategory = 'leave' | 'vacation' | 'gap' | 'unpaid';

interface DayIndicator {
  parent: Parent;
  category: IndicatorCategory;
}

// --- Context ---

const LeaveIndicatorContext = createContext<Map<string, DayIndicator[]>>(new Map());

// --- Helpers ---

function toKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function toCategory(type: LeaveSegmentType): IndicatorCategory {
  switch (type) {
    case 'preBirth':
    case 'mandatory':
    case 'quota':
    case 'shared':
    case 'overlap':
      return 'leave';
    case 'vacation':
      return 'vacation';
    case 'gap':
      return 'gap';
    case 'unpaid':
      return 'unpaid';
  }
}

function buildIndicatorMap(segments: LeaveSegment[]): Map<string, DayIndicator[]> {
  const map = new Map<string, DayIndicator[]>();

  for (const seg of segments) {
    const category = toCategory(seg.type);
    let current = new Date(seg.start);
    const end = new Date(seg.end);

    while (current < end) {
      const key = toKey(current);
      const existing = map.get(key);
      const indicator: DayIndicator = { parent: seg.parent, category };

      if (!existing) {
        map.set(key, [indicator]);
      } else {
        // Deduplicate by parent+category
        const isDuplicate = existing.some(
          (d) => d.parent === indicator.parent && d.category === indicator.category,
        );
        if (!isDuplicate) {
          existing.push(indicator);
        }
      }

      current = addDays(current, 1);
    }
  }

  return map;
}

function getDotColor(indicator: DayIndicator): string {
  const { parent, category } = indicator;

  switch (category) {
    case 'leave':
      return parent === 'mother' ? 'bg-pink-400' : 'bg-blue-400';
    case 'vacation':
      return parent === 'mother' ? 'bg-pink-200' : 'bg-blue-200';
    case 'gap':
      return 'bg-orange-400';
    case 'unpaid':
      return 'bg-gray-400';
  }
}

// --- Custom DayButton ---

function LeaveIndicatorDayButton({
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const indicatorMap = useContext(LeaveIndicatorContext);
  const key = toKey(day.date);
  const indicators = indicatorMap.get(key);
  const isOutside = modifiers.outside;

  return (
    <CalendarDayButton day={day} modifiers={modifiers} {...props}>
      {props.children}
      {!isOutside && indicators && indicators.length > 0 && (
        <span className="flex gap-0.5 justify-center">
          {indicators.slice(0, 3).map((ind, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${getDotColor(ind)}`}
            />
          ))}
        </span>
      )}
    </CalendarDayButton>
  );
}

// --- Exported Calendar wrapper ---

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
};

type LeaveIndicatorCalendarProps = CalendarProps & {
  segments: LeaveSegment[];
};

export function LeaveIndicatorCalendar({
  segments,
  ...calendarProps
}: LeaveIndicatorCalendarProps) {
  const indicatorMap = useMemo(() => buildIndicatorMap(segments), [segments]);

  return (
    <LeaveIndicatorContext.Provider value={indicatorMap}>
      <Calendar
        {...calendarProps}
        components={{
          ...calendarProps.components,
          DayButton: LeaveIndicatorDayButton,
        }}
      />
    </LeaveIndicatorContext.Provider>
  );
}
