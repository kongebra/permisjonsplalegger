'use client';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface DueDateInputProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DueDateInput({ value, onChange }: DueDateInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="due-date">Termindato</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="due-date"
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
            defaultMonth={value}
            locale={nb}
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date()}
            endMonth={new Date(new Date().getFullYear() + 3, 11)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
