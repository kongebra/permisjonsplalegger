"use client";

import { useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays,
  format,
} from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DayCell } from "./DayCell";
import { PeriodBandRenderer } from "./PeriodBandRenderer";
import type {
  CalendarDayData,
  PeriodBandData,
  MonthGridCallbacks,
} from "./types";

const WEEKDAYS = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"];

interface MonthGridProps {
  month: Date;
  days: CalendarDayData[];
  weekBands?: Map<
    string,
    { mother: PeriodBandData[]; father: PeriodBandData[] }
  >;
  interactive?: boolean;
  callbacks?: MonthGridCallbacks;
  isDragging?: boolean;
  showHeader?: boolean;
  showWeekdayRow?: boolean;
  headerClassName?: string;
  pickerMode?: boolean;
  // For non-interactive mode: provide status class/style per day
  getDayStatusClassName?: (day: CalendarDayData) => string;
  getDayInlineStyle?: (day: CalendarDayData) => React.CSSProperties | undefined;
}

export function MonthGrid({
  month,
  days,
  weekBands,
  interactive = false,
  callbacks,
  isDragging,
  showHeader = true,
  showWeekdayRow = true,
  headerClassName,
  pickerMode,
  getDayStatusClassName,
  getDayInlineStyle,
}: MonthGridProps) {
  // Compute weeks from month
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachWeekOfInterval(
      { start: calendarStart, end: calendarEnd },
      { weekStartsOn: 1 },
    );
  }, [month]);

  // Index days by date key for O(1) lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDayData>();
    for (const day of days) {
      const key = day.date.toISOString().split("T")[0];
      map.set(key, day);
    }
    return map;
  }, [days]);

  const getDaysForWeek = useCallback(
    (weekStart: Date): CalendarDayData[] => {
      const weekDays: CalendarDayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const key = date.toISOString().split("T")[0];
        const day = dayMap.get(key);
        if (day) {
          weekDays.push(day);
        }
      }
      return weekDays;
    },
    [dayMap],
  );

  return (
    <div
      className="select-none"
      role="grid"
      aria-label={format(month, "MMMM yyyy", { locale: nb })}
    >
      {showHeader && (
        <h3
          className={
            headerClassName ||
            (pickerMode
              ? "text-sm font-semibold text-center mb-2 capitalize"
              : "text-sm font-medium text-center mb-1 capitalize")
          }
        >
          {format(month, "MMMM yyyy", { locale: nb })}
        </h3>
      )}

      {/* Weekday headers */}
      {showWeekdayRow && (
        <div className="grid grid-cols-7 gap-0.5 mb-1" role="row">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              role="columnheader"
              className={`text-center text-xs font-medium py-1 ${
                idx === 5
                  ? "text-muted-foreground"
                  : idx === 6
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Week rows */}
      <div className={cn("flex flex-col", pickerMode ? "gap-0" : "gap-0.5")}>
        {weeks.map((weekStart) => {
          const weekDays = getDaysForWeek(weekStart);
          const weekKey = weekStart.toISOString();
          const bands = weekBands?.get(weekKey);

          return (
            <div key={weekKey} className="relative" role="row">
              {/* Day cells */}
              <div
                className={cn(
                  "grid grid-cols-7",
                  pickerMode ? "gap-0" : "gap-0.5",
                )}
              >
                {weekDays.map((day) => (
                  <DayCell
                    key={day.date.toISOString()}
                    day={day}
                    interactive={interactive}
                    pickerMode={pickerMode}
                    statusClassName={getDayStatusClassName?.(day)}
                    inlineStyle={getDayInlineStyle?.(day)}
                    onDateSelect={callbacks?.onDateSelect}
                    onPointerDown={callbacks?.onPointerDown}
                    onPointerEnter={callbacks?.onPointerEnter}
                    isDragging={isDragging}
                  />
                ))}
              </div>

              {/* Period bands overlay — skip in picker mode (strips in cells instead) */}
              {bands && !pickerMode && (
                <PeriodBandRenderer
                  motherBands={bands.mother}
                  fatherBands={bands.father}
                  onPeriodSelect={callbacks?.onPeriodSelect}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
