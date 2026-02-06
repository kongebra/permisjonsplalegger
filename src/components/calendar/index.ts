// Shared calendar primitives
export { DayCell } from './DayCell';
export { PeriodBandRenderer } from './PeriodBandRenderer';
export { MonthGrid } from './MonthGrid';
export { CalendarLegend } from './CalendarLegend';

// Pure resolver functions
export { resolveDayData, computeDayStatus, buildDayTooltip, buildDayAriaLabel } from './resolve-day';
export { resolveBands } from './resolve-bands';

// Color system
export {
  PARENT_COLORS,
  SEGMENT_COLORS,
  PERIOD_COLORS,
  STATUS_COLORS,
  getDayStatusStyle,
  getOverlapStyle,
  getVacationFullBorderStyle,
  getSegmentPattern,
  getSegmentColor,
  getPeriodColor,
} from './colors';

// Types
export type {
  CalendarDayData,
  CalendarDayPeriod,
  PeriodBandData,
  LegendItem,
  MonthGridCallbacks,
} from './types';

export type { DayStatus } from './colors';
