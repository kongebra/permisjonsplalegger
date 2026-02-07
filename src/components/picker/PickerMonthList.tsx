"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MonthGrid } from "@/components/calendar";
import type { PickerMonthData } from "./usePickerMonths";

const WEEKDAYS = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"];

interface PickerMonthListProps {
  months: Date[];
  monthHeights: number[];
  resolveMonthData: (month: Date) => PickerMonthData;
  onDaySelect: (date: Date) => void;
  initialScrollDate?: Date;
  showLegend?: boolean;
}

export function PickerMonthList({
  months,
  monthHeights,
  resolveMonthData,
  onDaySelect,
  initialScrollDate,
  showLegend = true,
}: PickerMonthListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Find the index of the month to scroll to
  const targetIndex = useMemo(() => {
    if (!initialScrollDate) return Math.floor(months.length / 2);
    const targetYear = initialScrollDate.getFullYear();
    const targetMonth = initialScrollDate.getMonth();
    const idx = months.findIndex(
      (m) => m.getFullYear() === targetYear && m.getMonth() === targetMonth,
    );
    return idx >= 0 ? idx : Math.floor(months.length / 2);
  }, [months, initialScrollDate]);

  // Track which months are visible (lazily rendered)
  const [visibleMonths, setVisibleMonths] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (
      let i = Math.max(0, targetIndex - 1);
      i <= Math.min(months.length - 1, targetIndex + 1);
      i++
    ) {
      initial.add(i);
    }
    return initial;
  });

  // Set up IntersectionObserver for lazy rendering
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleMonths((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const idx = Number(entry.target.getAttribute("data-month-index"));
            if (isNaN(idx)) continue;
            if (entry.isIntersecting) {
              if (!next.has(idx)) {
                next.add(idx);
                changed = true;
              }
            } else {
              if (next.has(idx)) {
                next.delete(idx);
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      },
      {
        root: container,
        rootMargin: "600px 0px",
      },
    );

    for (const sentinel of sentinelRefs.current) {
      if (sentinel) observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [months.length]);

  // Auto-scroll to target month on mount
  useEffect(() => {
    const sentinel = sentinelRefs.current[targetIndex];
    if (sentinel) {
      sentinel.scrollIntoView({ block: "center", behavior: "instant" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve month data only for visible months (memoized per-month)
  const resolvedCache = useRef(new Map<number, PickerMonthData>());

  const prevResolveRef = useRef(resolveMonthData);
  if (prevResolveRef.current !== resolveMonthData) {
    resolvedCache.current.clear();
    prevResolveRef.current = resolveMonthData;
  }

  const getMonthData = useCallback(
    (idx: number): PickerMonthData => {
      const cached = resolvedCache.current.get(idx);
      if (cached) return cached;
      const data = resolveMonthData(months[idx]);
      resolvedCache.current.set(idx, data);
      return data;
    },
    [resolveMonthData, months],
  );

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* Sticky header: weekdays + optional legend */}
      <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b">
        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-center gap-4 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.75 rounded-full bg-pink-300/70" />
              Mor
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.75 rounded-full bg-blue-300/70" />
              Far
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
              Termin
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Barnehage
            </span>
          </div>
        )}

        {/* Weekday row */}
        <div className="grid grid-cols-7 gap-0 px-3 py-1">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={`text-center text-[11px] font-medium ${
                idx === 5
                  ? "text-muted-foreground/70"
                  : idx === 6
                    ? "text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Month list */}
      <div className="px-3 pt-4">
        {months.map((month, idx) => (
          <div
            key={`${month.getFullYear()}-${month.getMonth()}`}
            ref={(el) => {
              sentinelRefs.current[idx] = el;
            }}
            data-month-index={idx}
            style={{ minHeight: monthHeights[idx] }}
            className="mb-6"
          >
            {visibleMonths.has(idx) ? (
              (() => {
                const data = getMonthData(idx);
                return (
                  <MonthGrid
                    month={data.month}
                    days={data.days}
                    weekBands={data.weekBands}
                    interactive={false}
                    showWeekdayRow={false}
                    pickerMode
                    callbacks={{ onDateSelect: onDaySelect }}
                  />
                );
              })()
            ) : (
              <h3 className="text-sm font-semibold text-center mb-2 capitalize text-muted-foreground/50">
                {format(month, "MMMM yyyy", { locale: nb })}
              </h3>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
