'use client';

import { cn } from '@/lib/utils';
import type { LegendItem } from './types';

interface CalendarLegendProps {
  items: LegendItem[];
}

export function CalendarLegend({ items }: CalendarLegendProps) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm justify-center list-none">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <div
            role="img"
            aria-label={`${item.label} farge`}
            className={cn(
              'w-4 h-4 rounded-sm',
              item.color,
              item.pattern === 'dashed' && 'border border-dashed border-current',
              item.pattern === 'hatched' && 'opacity-60',
            )}
            style={item.inlineStyle}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
