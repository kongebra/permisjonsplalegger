'use client';

import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { LeaveResult } from '@/lib/types';

interface DateSummaryProps {
  result: LeaveResult;
  showFather: boolean;
}

export function DateSummary({ result, showFather }: DateSummaryProps) {
  const formatDate = (date: Date) => format(date, 'd. MMM yyyy', { locale: nb });

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Hvem</th>
            <th className="p-3 text-left font-medium">Start</th>
            <th className="p-3 text-left font-medium">Slutt</th>
            <th className="p-3 text-right font-medium">Uker</th>
          </tr>
        </thead>
        <tbody>
          {/* Mor */}
          {result.mother.weeks > 0 && (
            <tr className="border-b">
              <td className="p-3 text-pink-600 dark:text-pink-400 font-medium">
                Mor
              </td>
              <td className="p-3">{formatDate(result.mother.start)}</td>
              <td className="p-3">{formatDate(result.mother.end)}</td>
              <td className="p-3 text-right">{result.mother.weeks}</td>
            </tr>
          )}

          {/* Overlapp (mellom mor og far) */}
          {result.overlap && (
            <tr className="border-b bg-purple-50 dark:bg-purple-950/20">
              <td className="p-3 text-purple-600 dark:text-purple-400 font-medium pl-6">
                ↳ Overlapp
              </td>
              <td className="p-3">{formatDate(result.overlap.start)}</td>
              <td className="p-3">{formatDate(result.overlap.end)}</td>
              <td className="p-3 text-right">{result.overlap.weeks}</td>
            </tr>
          )}

          {/* Far */}
          {showFather && result.father.weeks > 0 && (
            <tr className="border-b">
              <td className="p-3 text-blue-600 dark:text-blue-400 font-medium">
                Far
              </td>
              <td className="p-3">{formatDate(result.father.start)}</td>
              <td className="p-3">{formatDate(result.father.end)}</td>
              <td className="p-3 text-right">{result.father.weeks}</td>
            </tr>
          )}

          {/* Gap */}
          {result.gap.days > 0 && (
            <tr className="bg-red-50 dark:bg-red-950/20">
              <td className="p-3 text-red-600 dark:text-red-400 font-medium">
                Gap
              </td>
              <td className="p-3">{formatDate(result.gap.start)}</td>
              <td className="p-3">{formatDate(result.gap.end)}</td>
              <td className="p-3 text-right">
                {result.gap.days} dager
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total kalendertid */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total kalendertid:</span>
          <span className="font-medium">{result.totalCalendarWeeks} uker</span>
        </div>
      </div>
    </div>
  );
}
