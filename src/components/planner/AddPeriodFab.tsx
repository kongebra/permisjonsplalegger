'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddPeriodFabProps {
  onClick: () => void;
}

export function AddPeriodFab({ onClick }: AddPeriodFabProps) {
  return (
    <div className="fixed bottom-6 z-50 w-full max-w-3xl left-1/2 -translate-x-1/2 px-6 pointer-events-none flex justify-end">
      <Button
        size="lg"
        onClick={onClick}
        className="rounded-full w-14 h-14 shadow-lg pointer-events-auto"
        aria-label="Legg til periode"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
