import type { Parent, JobType } from '@/lib/types';

export interface CalendarEvent {
  id: string;
  startDate: Date; // inclusive
  endDate: Date; // exclusive
  parent: Parent;
  type: string;
  label: string;
  color?: string; // Tailwind class
  inlineColor?: string; // hex for custom colors
  pattern?: 'solid' | 'dashed' | 'hatched';
}

export interface IconMarker {
  date: Date;
  type: 'dueDate' | 'daycareStart';
  label: string;
}

export interface SmartPeriodPickerProps {
  startDate: Date | null;
  endDate: Date | null; // exclusive
  onSelectionChange: (start: Date | null, end: Date | null) => void;
  onConfirm: (start: Date, end: Date) => void;
  onClose: () => void;

  events: CalendarEvent[]; // existing periods → rendered as bands
  iconMarkers?: IconMarker[]; // dueDate, daycareStart → dot + colored text
  holidayMap: Map<string, string>;

  minDate?: Date;
  maxDate?: Date;
  initialScrollDate?: Date; // auto-scroll target on open
  jobType?: JobType; // For riktig feriedagstelling i footer (default: 'office')
}
