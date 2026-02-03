'use client';

import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage } from '@/lib/types';

interface CoverageToggleProps {
  value: Coverage;
  onChange: (value: Coverage) => void;
}

export function CoverageToggle({ value, onChange }: CoverageToggleProps) {
  return (
    <div className="space-y-2">
      <Label>Dekningsgrad</Label>
      <div className="flex gap-2">
        <Toggle
          pressed={value === 100}
          onPressedChange={() => onChange(100)}
          className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <div className="text-center">
            <div className="font-semibold">100%</div>
            <div className="text-xs opacity-80">
              {LEAVE_CONFIG[100].total} uker
            </div>
          </div>
        </Toggle>
        <Toggle
          pressed={value === 80}
          onPressedChange={() => onChange(80)}
          className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <div className="text-center">
            <div className="font-semibold">80%</div>
            <div className="text-xs opacity-80">
              {LEAVE_CONFIG[80].total} uker
            </div>
          </div>
        </Toggle>
      </div>
      <p className="text-sm text-muted-foreground">
        {value === 100
          ? 'Full lønn (maks 6G) i 49 uker'
          : '80% lønn (maks 6G) i 59 uker'}
      </p>
    </div>
  );
}
