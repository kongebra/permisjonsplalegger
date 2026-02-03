'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { ParentRights } from '@/lib/types';

interface RightsSelectorProps {
  value: ParentRights;
  onChange: (value: ParentRights) => void;
}

const rightsOptions: { value: ParentRights; label: string; description: string }[] = [
  {
    value: 'both',
    label: 'Begge foreldre',
    description: 'Begge har opptjent rett til foreldrepenger',
  },
  {
    value: 'mother-only',
    label: 'Kun mor',
    description: 'Kun mor har opptjent rett til foreldrepenger',
  },
  {
    value: 'father-only',
    label: 'Kun far/medmor',
    description: 'Kun far/medmor har opptjent rett til foreldrepenger',
  },
];

export function RightsSelector({ value, onChange }: RightsSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Hvem har rett til foreldrepenger?</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                For å ha rett til foreldrepenger må du ha vært i arbeid minst 6
                av de siste 10 månedene før permisjonen starter.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ParentRights)}
        className="flex flex-col gap-2"
      >
        {rightsOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
