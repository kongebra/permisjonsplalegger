'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePickerSelection } from './usePickerSelection';
import { usePickerMonths } from './usePickerMonths';
import { PickerHeader } from './PickerHeader';
import { PickerFooter } from './PickerFooter';
import { PickerMonthList } from './PickerMonthList';
import { PickerDesktopView } from './PickerDesktopView';
import type { SmartPeriodPickerProps } from './types';

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getIsMobile() {
  return !window.matchMedia('(min-width: 768px)').matches;
}

function getIsMobileServer() {
  return true; // Default to mobile on server
}

export function SmartPeriodPicker({
  startDate,
  endDate,
  onSelectionChange,
  onConfirm,
  onClose,
  events,
  iconMarkers,
  holidayMap,
  initialScrollDate,
}: SmartPeriodPickerProps) {
  // Responsive: detect mobile vs desktop
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  // Selection state machine
  const { startDate: selStart, endDate: selEnd, phase, handleDayTap } = usePickerSelection(
    startDate,
    endDate,
    onSelectionChange,
  );

  // Month data
  const { months, monthHeights, resolveMonthData } = usePickerMonths({
    events,
    iconMarkers,
    holidayMap,
    selectionStart: selStart,
    selectionEnd: selEnd,
    initialScrollDate,
  });

  const handleConfirm = useCallback(() => {
    if (selStart && selEnd) {
      onConfirm(selStart, selEnd);
    }
  }, [selStart, selEnd, onConfirm]);

  // Mobile: fullscreen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <PickerHeader
          startDate={selStart}
          endDate={selEnd}
          phase={phase}
          onClose={onClose}
        />
        <PickerMonthList
          months={months}
          monthHeights={monthHeights}
          resolveMonthData={resolveMonthData}
          onDaySelect={handleDayTap}
          initialScrollDate={initialScrollDate}
        />
        <PickerFooter
          startDate={selStart}
          endDate={selEnd}
          onConfirm={handleConfirm}
        />
      </div>
    );
  }

  // Desktop: dialog with two-month view
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <PickerHeader
          startDate={selStart}
          endDate={selEnd}
          phase={phase}
          onClose={onClose}
        />
        <div className="px-4 py-4">
          <PickerDesktopView
            resolveMonthData={resolveMonthData}
            onDaySelect={handleDayTap}
            initialScrollDate={initialScrollDate}
          />
        </div>
        <PickerFooter
          startDate={selStart}
          endDate={selEnd}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
