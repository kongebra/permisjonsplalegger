'use client';

import type { LegendItem } from './types';

interface CalendarLegendProps {
  items: LegendItem[];
}

export function CalendarLegend({ items }: CalendarLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm justify-center">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className={`w-4 h-4 rounded-sm ${item.color}`}
            style={item.inlineStyle}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
