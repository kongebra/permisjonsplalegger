"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  eachDayOfInterval,
  getDay,
  addMonths,
  max,
  isSameDay,
} from "date-fns";
import { nb } from "date-fns/locale";
import type { LeaveResult, LeaveSegment } from "@/lib/types";

interface CalendarTimelineProps {
  result: LeaveResult;
  showFather: boolean;
  dueDate: Date;
}

type DayStatus =
  | "mother"
  | "father"
  | "motherVacation"
  | "fatherVacation"
  | "motherVacationOverlapFather" // Mor ferie + far permisjon samme dag
  | "fatherVacationOverlapMother" // Far ferie + mor permisjon samme dag
  | "overlap"
  | "gap"
  | "duedate"
  | "daycare"
  | "daycareWithMotherVacation" // Barnehagestart + mor ferie
  | "daycareWithFatherVacation" // Barnehagestart + far ferie
  | "normal";

const statusColors: Record<DayStatus, string> = {
  mother: "bg-pink-300 dark:bg-pink-500",
  father: "bg-blue-300 dark:bg-blue-500",
  motherVacation: "bg-pink-300 dark:bg-pink-500", // Full dashed border via inline style
  fatherVacation: "bg-blue-300 dark:bg-blue-500", // Full dashed border via inline style
  motherVacationOverlapFather: "", // Gradient + half border via inline style
  fatherVacationOverlapMother: "", // Gradient + half border via inline style
  overlap: "", // Handled via inline style for gradient
  gap: "bg-red-200 dark:bg-red-900/50 border border-dashed border-red-400",
  duedate: "bg-violet-500 dark:bg-violet-600 text-white font-bold",
  daycare: "bg-green-500 dark:bg-green-600 text-white font-bold",
  daycareWithMotherVacation: "bg-green-500 dark:bg-green-600 text-white font-bold", // Green bg + dashed border
  daycareWithFatherVacation: "bg-green-500 dark:bg-green-600 text-white font-bold", // Green bg + dashed border
  normal: "bg-muted",
};

// Diagonal gradient for overlap: pink (mother) top-left, blue (father) bottom-right
const getOverlapStyle = (): React.CSSProperties => ({
  background: `linear-gradient(135deg,
    rgb(249, 168, 212) 50%,
    rgb(147, 197, 253) 50%)`,
});

// Full dashed border styles for vacation days (when no overlap with other parent)
const getVacationFullBorderStyle = (parent: 'mother' | 'father'): React.CSSProperties => {
  if (parent === 'mother') {
    return {
      border: '2px dashed rgb(190, 24, 93)',
    };
  }
  return {
    border: '2px dashed rgb(30, 64, 175)',
  };
};

// Half dashed border styles for vacation days overlapping with other parent's leave
const getVacationHalfBorderStyle = (parent: 'mother' | 'father'): React.CSSProperties => {
  if (parent === 'mother') {
    return {
      background: `linear-gradient(135deg,
        rgb(249, 168, 212) 50%,
        rgb(147, 197, 253) 50%)`,
      borderLeft: '2px dashed rgb(190, 24, 93)',
      borderTop: '2px dashed rgb(190, 24, 93)',
    };
  }
  return {
    background: `linear-gradient(135deg,
      rgb(249, 168, 212) 50%,
      rgb(147, 197, 253) 50%)`,
    borderRight: '2px dashed rgb(30, 64, 175)',
    borderBottom: '2px dashed rgb(30, 64, 175)',
  };
};

function getDayStatus(
  date: Date,
  segments: LeaveSegment[],
  gap: { start: Date; end: Date; days: number },
  dueDate: Date,
  daycareStart: Date,
): DayStatus {
  // Sjekk termindato først
  if (isSameDay(date, dueDate)) {
    return "duedate";
  }

  // Sjekk barnehagestart - men sjekk også om det er ferie denne dagen
  if (isSameDay(date, daycareStart)) {
    const dateNorm = startOfDay(date);
    const vacationOnDaycare = segments.find((seg) => {
      if (seg.type !== "vacation") return false;
      const segStartNorm = startOfDay(seg.start);
      const segEndNorm = startOfDay(seg.end);
      return dateNorm >= segStartNorm && dateNorm < segEndNorm;
    });
    if (vacationOnDaycare) {
      return vacationOnDaycare.parent === "mother"
        ? "daycareWithMotherVacation"
        : "daycareWithFatherVacation";
    }
    return "daycare";
  }

  // Sjekk gap (kun hvis det er positivt gap)
  // Bruk isSameDay for å unngå tidspunkt-problemer
  const isOnOrAfterGapStart = isSameDay(date, gap.start) || date > gap.start;
  const isBeforeGapEnd = date < gap.end && !isSameDay(date, gap.end);

  if (gap.days > 0 && isOnOrAfterGapStart && isBeforeGapEnd) {
    return "gap";
  }

  // Normaliser for segment-sjekk
  const dateNorm = startOfDay(date);

  // Sjekk segmenter
  const matchingSegments = segments.filter((seg) => {
    const segStartNorm = startOfDay(seg.start);
    const segEndNorm = startOfDay(seg.end);
    // Slutt er ekslusiv, så vi sjekker < segEnd (ikke <=)
    return dateNorm >= segStartNorm && dateNorm < segEndNorm;
  });

  // Hvis det er overlapp (flere segmenter på samme dag)
  if (matchingSegments.length > 1) {
    // Sjekk om det er ferie som overlapper med permisjon
    const motherVacation = matchingSegments.find(s => s.parent === 'mother' && s.type === 'vacation');
    const fatherVacation = matchingSegments.find(s => s.parent === 'father' && s.type === 'vacation');
    const motherLeave = matchingSegments.find(s => s.parent === 'mother' && s.type !== 'vacation');
    const fatherLeave = matchingSegments.find(s => s.parent === 'father' && s.type !== 'vacation');

    // Mor ferie + far permisjon
    if (motherVacation && fatherLeave) {
      return "motherVacationOverlapFather";
    }
    // Far ferie + mor permisjon
    if (fatherVacation && motherLeave) {
      return "fatherVacationOverlapMother";
    }
    // Vanlig overlapp (begge har permisjon)
    return "overlap";
  }

  if (matchingSegments.length === 1) {
    const seg = matchingSegments[0];
    if (seg.type === "vacation") {
      return seg.parent === "mother" ? "motherVacation" : "fatherVacation";
    }
    return seg.parent === "mother" ? "mother" : "father";
  }

  return "normal";
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
        {format(month, "MMMM yyyy", { locale: nb })}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {/* Ukedager header */}
        {["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"].map((day, i) => (
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
            : "normal";

          // Bygg tooltip
          let tooltip = format(day, "d. MMMM yyyy", { locale: nb });
          if (isSameDay(day, dueDate)) tooltip += " - Termindato";
          if (isSameDay(day, daycareStart)) tooltip += " - Barnehagestart";

          // Bruk inline style for overlap gradient og ferie-styling
          const getInlineStyle = (): React.CSSProperties | undefined => {
            switch (status) {
              case "overlap":
                return getOverlapStyle();
              case "motherVacation":
                return getVacationFullBorderStyle('mother');
              case "fatherVacation":
                return getVacationFullBorderStyle('father');
              case "motherVacationOverlapFather":
                return getVacationHalfBorderStyle('mother');
              case "fatherVacationOverlapMother":
                return getVacationHalfBorderStyle('father');
              case "daycareWithMotherVacation":
                return getVacationFullBorderStyle('mother');
              case "daycareWithFatherVacation":
                return getVacationFullBorderStyle('father');
              default:
                return undefined;
            }
          };

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square rounded-sm flex items-center justify-center text-xs ${statusColors[status]}`}
              style={getInlineStyle()}
              title={tooltip}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarTimeline({
  result,
  showFather,
  dueDate,
}: CalendarTimelineProps) {
  const { segments, gap, mother, father } = result;

  // Finn start og slutt for hele perioden
  const periodStart = mother.start;
  const daycareStart = gap.end;

  // Slutt er den seneste av: mor ferdig, far ferdig, barnehagestart, eller siste segment (inkl. ferie)
  const possibleEndDates = [mother.end, gap.end];
  if (showFather && father.weeks > 0) {
    possibleEndDates.push(father.end);
  }
  // Inkluder alle segmenters slutt-datoer (viktig for ferie som kan gå forbi barnehagestart)
  segments.forEach((seg) => {
    possibleEndDates.push(seg.end);
  });
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
            <div className="w-4 h-4 rounded-sm" style={getOverlapStyle()} />
            <span>Overlapp</span>
          </div>
        )}
        {segments.some((s) => s.type === "vacation" && s.parent === "mother") && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-sm bg-pink-300 dark:bg-pink-500"
              style={{ border: '2px dashed rgb(190, 24, 93)' }}
            />
            <span>Mor ferie</span>
          </div>
        )}
        {segments.some((s) => s.type === "vacation" && s.parent === "father") && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-sm bg-blue-300 dark:bg-blue-500"
              style={{ border: '2px dashed rgb(30, 64, 175)' }}
            />
            <span>Far ferie</span>
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
