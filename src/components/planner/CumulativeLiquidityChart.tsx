'use client';

import { useCumulativeTimeSeries } from '@/store/hooks';
import type { TimeSeriesPoint } from '@/lib/types';

const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 32, left: 56 };

function formatKr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function Chart({ data }: { data: TimeSeriesPoint[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.cumulative80, d.cumulative100)));
  const minVal = 0;
  const valueRange = maxVal - minVal || 1;

  const chartWidth = '100%';
  const viewBoxWidth = 600;
  const plotWidth = viewBoxWidth - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  function toX(i: number): number {
    return PADDING.left + i * xStep;
  }

  function toY(val: number): number {
    return PADDING.top + plotHeight - ((val - minVal) / valueRange) * plotHeight;
  }

  // Build polyline points
  const points80 = data.map((d, i) => `${toX(i)},${toY(d.cumulative80)}`).join(' ');
  const points100 = data.map((d, i) => `${toX(i)},${toY(d.cumulative100)}`).join(' ');

  // Y-axis ticks (4 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (valueRange * i) / 4);

  // X-axis labels (every month or every other month for readability)
  const labelInterval = data.length > 12 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${CHART_HEIGHT}`}
      width={chartWidth}
      className="w-full"
      role="img"
      aria-label="Kumulativt inntektsdiagram: 80% vs 100% dekningsgrad"
    >
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            y1={toY(tick)}
            x2={viewBoxWidth - PADDING.right}
            y2={toY(tick)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="4 4"
          />
          <text
            x={PADDING.left - 6}
            y={toY(tick) + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="9"
          >
            {formatKr(tick)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) =>
        i % labelInterval === 0 ? (
          <text
            key={d.month.toISOString()}
            x={toX(i)}
            y={CHART_HEIGHT - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="8"
          >
            {d.month.toLocaleDateString('nb-NO', { month: 'short' })}
          </text>
        ) : null
      )}

      {/* 80% line (orange) */}
      <polyline
        points={points80}
        fill="none"
        stroke="#f97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 100% line (blue) */}
      <polyline
        points={points100}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {data.map((d, i) => (
        <g key={`dots-${i}`}>
          <circle cx={toX(i)} cy={toY(d.cumulative80)} r="3" fill="#f97316" />
          <circle cx={toX(i)} cy={toY(d.cumulative100)} r="3" fill="#3b82f6" />
        </g>
      ))}
    </svg>
  );
}

export function CumulativeLiquidityChart() {
  const data = useCumulativeTimeSeries();

  if (!data || data.length === 0) return null;

  const last = data[data.length - 1];
  const diff = last.cumulative80 - last.cumulative100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Kumulativ inntekt</h3>
        {Math.abs(diff) > 1000 && (
          <span className="text-xs text-muted-foreground">
            {diff > 0 ? '80%' : '100%'} gir {formatKr(Math.abs(diff))} kr mer totalt
          </span>
        )}
      </div>

      <Chart data={data} />

      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-orange-500" />
          <span>80% dekning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-blue-500" />
          <span>100% dekning</span>
        </div>
      </div>
    </div>
  );
}
