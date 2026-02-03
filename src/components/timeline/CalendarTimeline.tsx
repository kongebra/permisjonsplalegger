'use client';

import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  max,
  isSameDay,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import type { LeaveResult, LeaveSegment } from '@/lib/types';

interface CalendarTimelineProps {
  result: LeaveResult;
  showFather: boolean;
  dueDate: Date;
}

type DayStatus =
  | 'mother'
  | 'father'
  | 'overlap'
  | 'gap'
  | 'duedate'
  | 'daycare'
  | 'normal';

const statusColors: Record<DayStatus, string> = {
  mother: 'bg-pink-300 dark:bg-pink-500',
  father: 'bg-blue-300 dark:bg-blue-500',
  overlap: 'bg-orange-300 dark:bg-orange-500',
  gap: 'bg-red-200 dark:bg-red-900/50 border border-dashed border-red-400',
  duedate: 'bg-violet-500 dark:bg-violet-600 text-white font-bold',
  daycare: 'bg-green-500 dark:bg-green-600 text-white font-bold',
  normal: 'bg-muted/30',
};

function getDayStatus(
  date: Date,
  segments: LeaveSegment[],
  gap: { start: Date; end: Date; days: number },
  dueDate: Date,
  daycareStart: Date
): DayStatus {
  // Sjekk termindato først
  if (isSameDay(date, dueDate)) {
    return 'duedate';
  }

  // Sjekk barnehagestart
  if (isSameDay(date, daycareStart)) {
    return 'daycare';
  }

  // Sjekk gap (kun hvis det er positivt gap)
  if (
    gap.days > 0 &&
    date >= gap.start &&
    date < gap.end
  ) {
    return 'gap';
  }

  // Sjekk segmenter
  const matchingSegments = segments.filter((seg) => {
    const segEnd = new Date(seg.end);
    segEnd.setDate(segEnd.getDate() - 1); // Slutt er ekslusiv
    return date >= seg.start && date <= segEnd;
  });

  // Hvis det er overlapp (flere segmenter på samme dag)
  if (matchingSegments.length > 1) {
    return 'overlap';
  }

  if (matchingSegments.length === 1) {
    const seg = matchingSegments[0];
    return seg.parent === 'mother' ? 'mother' : 'father';
  }

  return 'normal';
}

interface MonthCalendarProps {
  month: Date;
  segments: LeaveSegment[];
  gap: { start: Date; end: Date; days: number };
  dueDate: Date;
  daycareStart: Date;
  periodStart: Date;
  periodEnd: Date;
}

function MonthCalendar({
  month,
  segments,
  gap,
  dueDate,
  daycareStart,
  periodStart,
  periodEnd,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Finn hvilken ukedag måneden starter på (0 = søndag, 1 = mandag, ...)
  // Vi bruker mandag som første dag, så juster
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Fyll inn tomme celler før første dag
  const emptyDays = Array(adjustedStartDay).fill(null);

  return (
    <div className="flex flex-col w-full">
      <div className="text-sm font-medium text-center mb-1 capitalize">
        {format(month, 'MMMM yyyy', { locale: nb })}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {/* Ukedager header */}
        {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((day, i) => (
          <div
            key={i}
            className="aspect-square flex items-center justify-center text-[10px] text-muted-foreground font-medium"
          >
            {day}
          </div>
        ))}

        {/* Tomme celler */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Dager */}
        {days.map((day) => {
          // Sjekk om dagen er innenfor den relevante perioden
          const isInPeriod = day >= periodStart && day <= periodEnd;
          const status = isInPeriod
            ? getDayStatus(day, segments, gap, dueDate, daycareStart)
            : 'normal';

          // Bygg tooltip
          let tooltip = format(day, 'd. MMMM yyyy', { locale: nb });
          if (isSameDay(day, dueDate)) tooltip += ' - Termindato';
          if (isSameDay(day, daycareStart)) tooltip += ' - Barnehagestart';

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square rounded-sm flex items-center justify-center text-xs ${statusColors[status]}`}
              title={tooltip}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarTimeline({ result, showFather, dueDate }: CalendarTimelineProps) {
  const { segments, gap, mother, father } = result;

  // Finn start og slutt for hele perioden
  const periodStart = mother.start;
  const daycareStart = gap.end;

  // Slutt er den seneste av: mor ferdig, far ferdig, eller barnehagestart
  const possibleEndDates = [mother.end, gap.end];
  if (showFather && father.weeks > 0) {
    possibleEndDates.push(father.end);
  }
  const periodEnd = max(possibleEndDates);

  // Generer alle måneder som skal vises (med padding til hele rader av 4)
  const months = useMemo(() => {
    const monthList: Date[] = [];
    let current = startOfMonth(periodStart);

    // Legg til alle måneder til vi passerer periodEnd
    while (current <= periodEnd) {
      monthList.push(current);
      current = addMonths(current, 1);
    }

    // Fyll opp til nærmeste 4 (hele rader)
    const remainder = monthList.length % 4;
    if (remainder > 0) {
      const toAdd = 4 - remainder;
      for (let i = 0; i < toAdd; i++) {
        monthList.push(current);
        current = addMonths(current, 1);
      }
    }

    return monthList;
  }, [periodStart, periodEnd]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Permisjonskalender</h3>

      {/* Kalender grid - maks 4 per rad, responsiv bredde */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {months.map((month) => (
            <MonthCalendar
              key={month.toISOString()}
              month={month}
              segments={segments}
              gap={gap}
              dueDate={dueDate}
              daycareStart={daycareStart}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-pink-300 dark:bg-pink-500" />
          <span>Mor</span>
        </div>
        {showFather && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-blue-300 dark:bg-blue-500" />
            <span>Far</span>
          </div>
        )}
        {result.overlap && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-orange-300 dark:bg-orange-500" />
            <span>Overlapp</span>
          </div>
        )}
        {gap.days > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm border border-dashed border-red-400 bg-red-200 dark:bg-red-900/50" />
            <span>Gap</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-violet-500 dark:bg-violet-600" />
          <span>Termindato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-green-500 dark:bg-green-600" />
          <span>Barnehagestart</span>
        </div>
      </div>
    </div>
  );
}
