'use client';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CalendarIcon, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface DaycareInputProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DaycareInput({ value, onChange }: DaycareInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="daycare-date">Barnehagestart</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Hovedopptaket til barnehage er vanligvis 1. august. Perioden
                mellom permisjonen slutter og barnehagestart kalles
                &quot;gapet&quot;.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="daycare-date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              format(value, 'PPP', { locale: nb })
            ) : (
              <span>Velg dato</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => date && onChange(date)}
            locale={nb}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
