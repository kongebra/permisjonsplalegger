"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  addMonths,
  startOfDay,
  max,
} from "date-fns";
import type { LeaveResult } from "@/lib/types";
import { getHolidayMap } from "@/lib/holidays";
import {
  MonthGrid,
  CalendarLegend,
  resolveDayData,
  resolveBands,
  computeDayStatus,
  STATUS_COLORS,
  getDayStatusStyle,
  getOverlapStyle,
} from "@/components/calendar";
import type { CalendarDayData, LegendItem, PeriodBandData } from "@/components/calendar";

interface CalendarTimelineProps {
  result: LeaveResult;
  showFather: boolean;
  dueDate: Date;
}

export function CalendarTimeline({
  result,
  showFather,
  dueDate,
}: CalendarTimelineProps) {
  const { segments, gap, mother, father } = result;

  // Period boundaries
  const periodStart = mother.start;
  const daycareStart = gap.end;

  const possibleEndDates = [mother.end, gap.end];
  if (showFather && father.weeks > 0) {
    possibleEndDates.push(father.end);
  }
  segments.forEach((seg) => possibleEndDates.push(seg.end));
  const periodEnd = max(possibleEndDates);

  // Generate months to display (padded to rows of 4)
  const months = useMemo(() => {
    const monthList: Date[] = [];
    let current = startOfMonth(periodStart);
    while (current <= periodEnd) {
      monthList.push(current);
      current = addMonths(current, 1);
    }
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

  // Holiday map for entire period
  const holidayMap = useMemo(() => {
    return getHolidayMap(periodStart, periodEnd);
  }, [periodStart, periodEnd]);

  const today = useMemo(() => startOfDay(new Date()), []);

  // Pre-compute day data and week bands per month
  const monthData = useMemo(() => {
    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const weeks = eachWeekOfInterval(
        { start: calendarStart, end: calendarEnd },
        { weekStartsOn: 1 },
      );

      // All days in calendar view
      const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      const days = allDays.map((date) =>
        resolveDayData(date, {
          segments,
          gap,
          dueDate,
          daycareStart,
          holidayMap,
          month,
          today,
          periodStart,
          periodEnd,
        }),
      );

      // Compute status for each day (for coloring)
      const dayStatusMap = new Map<string, string>();
      for (const day of days) {
        const isInPeriod = day.date >= periodStart && day.date <= periodEnd;
        const status = isInPeriod
          ? computeDayStatus(day.date, segments, gap, dueDate, daycareStart)
          : "normal";
        dayStatusMap.set(day.date.toISOString(), status);
      }

      // Week bands
      const weekBands = new Map<string, { mother: PeriodBandData[]; father: PeriodBandData[] }>();
      for (const weekStart of weeks) {
        weekBands.set(weekStart.toISOString(), resolveBands(weekStart, segments));
      }

      return { month, days, weekBands, dayStatusMap };
    });
  }, [months, segments, gap, dueDate, daycareStart, holidayMap, today, periodStart, periodEnd]);

  // Status class getter per day (for CalendarTimeline's full-cell coloring)
  const getDayStatusClassName = (dayStatusMap: Map<string, string>) => (day: CalendarDayData) => {
    const status = (dayStatusMap.get(day.date.toISOString()) || "normal") as keyof typeof STATUS_COLORS;
    return STATUS_COLORS[status];
  };

  const getDayInlineStyle = (dayStatusMap: Map<string, string>) => (day: CalendarDayData) => {
    const status = (dayStatusMap.get(day.date.toISOString()) || "normal") as keyof typeof STATUS_COLORS;
    return getDayStatusStyle(status);
  };

  // Build legend items
  const legendItems = useMemo((): LegendItem[] => {
    const items: LegendItem[] = [];

    items.push({ id: "mother", color: "bg-mother-base dark:bg-mother-strong", pattern: "solid", label: "Mor" });

    if (showFather) {
      items.push({ id: "father", color: "bg-father-base dark:bg-father-strong", pattern: "solid", label: "Far" });
    }

    if (result.overlap) {
      items.push({
        id: "overlap",
        color: "",
        pattern: "solid",
        label: "Overlapp",
        inlineStyle: getOverlapStyle(),
      });
    }

    if (segments.some((s) => s.type === "vacation" && s.parent === "mother")) {
      items.push({
        id: "mother-vacation",
        color: "bg-mother-base dark:bg-mother-strong",
        pattern: "dashed",
        label: "Mor ferie",
        inlineStyle: { border: "2px dashed var(--color-mother-strong)" },
      });
    }

    if (segments.some((s) => s.type === "vacation" && s.parent === "father")) {
      items.push({
        id: "father-vacation",
        color: "bg-father-base dark:bg-father-strong",
        pattern: "dashed",
        label: "Far ferie",
        inlineStyle: { border: "2px dashed var(--color-father-strong)" },
      });
    }

    if (segments.some((s) => s.type === "unpaid")) {
      items.push({
        id: "unpaid",
        color: "bg-unpaid dark:bg-unpaid",
        pattern: "hatched",
        label: "Ulønnet",
        inlineStyle: { border: "2px dashed rgb(107, 114, 128)" },
      });
    }

    if (gap.days > 0) {
      items.push({
        id: "gap",
        color: "border border-dashed border-gap-border bg-gap dark:bg-gap",
        pattern: "dashed",
        label: "Gap",
      });
    }

    items.push({ id: "duedate", color: "bg-duedate", pattern: "solid", label: "Termindato" });
    items.push({ id: "daycare", color: "bg-daycare", pattern: "solid", label: "Barnehagestart" });
    items.push({
      id: "redday",
      color: "bg-muted text-destructive font-bold flex items-center justify-center text-[8px]",
      pattern: "solid",
      label: "Rød dag (søn/helligdag)",
    });

    return items;
  }, [showFather, result.overlap, segments, gap.days]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Permisjonskalender</h3>

      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {monthData.map(({ month, days, weekBands, dayStatusMap }) => (
            <MonthGrid
              key={month.toISOString()}
              month={month}
              days={days}
              weekBands={weekBands}
              interactive={false}
              getDayStatusClassName={getDayStatusClassName(dayStatusMap)}
              getDayInlineStyle={getDayInlineStyle(dayStatusMap)}
            />
          ))}
        </div>
      </div>

      <CalendarLegend items={legendItems} />
    </div>
  );
}
