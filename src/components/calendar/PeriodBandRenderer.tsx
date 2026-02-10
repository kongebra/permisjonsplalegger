'use client';

import { cn } from '@/lib/utils';
import type { PeriodBandData } from './types';

interface PeriodBandRendererProps {
  motherBands: PeriodBandData[];
  fatherBands: PeriodBandData[];
  onPeriodSelect?: (periodId: string) => void;
}

function renderBand(
  band: PeriodBandData,
  isTop: boolean,
  onPeriodSelect?: (periodId: string) => void,
) {
  const leftPercent = (band.startDayIndex / 7) * 100;
  const widthPercent = ((band.endDayIndex - band.startDayIndex) / 7) * 100;
  const isInteractive = !!(onPeriodSelect && band.periodId);

  const handleClick = () => {
    if (band.periodId && onPeriodSelect) {
      onPeriodSelect(band.periodId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isInteractive) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      key={band.id}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? -1 : undefined}
      className={cn(
        'absolute h-1/2 flex items-center overflow-hidden',
        isTop ? 'top-0' : 'bottom-0',
        band.color,
        band.isStart && 'rounded-l-sm',
        band.isEnd && 'rounded-r-sm',
        band.pattern === 'dashed' && 'border-t border-dashed border-current opacity-80',
        band.pattern === 'hatched' && 'opacity-60',
        isInteractive && 'pointer-events-auto cursor-pointer hover:brightness-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        ...band.inlineStyle,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={band.label}
    >
      {band.showLabel && (
        <span className="pl-1 text-[11px] leading-none font-medium text-foreground/70 whitespace-nowrap truncate">
          {band.label}
        </span>
      )}
    </div>
  );
}

export function PeriodBandRenderer({
  motherBands,
  fatherBands,
  onPeriodSelect,
}: PeriodBandRendererProps) {
  if (motherBands.length === 0 && fatherBands.length === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="relative h-7 pointer-events-none -mt-0.5">
      {motherBands.map((band) => renderBand(band, true, onPeriodSelect))}
      {fatherBands.map((band) => renderBand(band, false, onPeriodSelect))}
    </div>
  );
}
