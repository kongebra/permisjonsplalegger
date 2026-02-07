import type { LeaveSegment, CustomPeriod } from '@/lib/types';
import type { CalendarEvent, IconMarker } from './types';
import { getSegmentPattern } from '@/components/calendar/colors';

const SEGMENT_LABELS: Record<string, Record<'mother' | 'father', string>> = {
  preBirth: { mother: 'Mor før termin', father: 'Far før termin' },
  mandatory: { mother: 'Mor obligatorisk', father: 'Far obligatorisk' },
  quota: { mother: 'Mors kvote', father: 'Fars kvote' },
  shared: { mother: 'Fellesperiode (mor)', father: 'Fellesperiode (far)' },
  overlap: { mother: 'Overlapp (mor)', father: 'Overlapp (far)' },
  vacation: { mother: 'Ferie (mor)', father: 'Ferie (far)' },
  unpaid: { mother: 'Ulønnet (mor)', father: 'Ulønnet (far)' },
  gap: { mother: 'Gap', father: 'Gap' },
};

const PERIOD_LABELS: Record<string, Record<'mother' | 'father', string>> = {
  permisjon: { mother: 'Mor permisjon', father: 'Far permisjon' },
  ferie: { mother: 'Ferie (mor)', father: 'Ferie (far)' },
  ulonnet: { mother: 'Ulønnet (mor)', father: 'Ulønnet (far)' },
  annet: { mother: 'Annet (mor)', father: 'Annet (far)' },
};

/**
 * Convert existing leave data to CalendarEvent[] for the picker.
 * Excludes the period being edited so the user sees "everything else".
 */
export function buildPickerEvents(
  segments: LeaveSegment[],
  customPeriods: CustomPeriod[],
  editingPeriodId?: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const seg of segments) {
    events.push({
      id: `seg-${seg.parent}-${seg.type}-${seg.start.toISOString()}`,
      startDate: seg.start,
      endDate: seg.end,
      parent: seg.parent,
      type: seg.type,
      label: SEGMENT_LABELS[seg.type]?.[seg.parent] ?? seg.type,
      pattern: getSegmentPattern(seg.type),
    });
  }

  for (const period of customPeriods) {
    if (period.id === editingPeriodId) continue;

    events.push({
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      parent: period.parent,
      type: period.type,
      label: period.label || (PERIOD_LABELS[period.type]?.[period.parent] ?? period.type),
      inlineColor: period.color,
      pattern: getSegmentPattern(period.type),
    });
  }

  return events;
}

/**
 * Build icon markers for special dates.
 */
export function buildIconMarkers(
  dueDate: Date,
  daycareStart?: Date,
): IconMarker[] {
  const markers: IconMarker[] = [
    { date: dueDate, type: 'dueDate', label: 'Termindato' },
  ];

  if (daycareStart) {
    markers.push({ date: daycareStart, type: 'daycareStart', label: 'Barnehagestart' });
  }

  return markers;
}
