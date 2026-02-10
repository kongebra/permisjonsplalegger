'use client';

import { cn } from '@/lib/utils';
import type { QuotaUsage } from '@/lib/types';

interface QuotaSummaryProps {
  quotaUsage: QuotaUsage[];
}

const typeLabels: Record<QuotaUsage['type'], string> = {
  mother: 'Mødrekvote',
  father: 'Fedrekvote',
  shared: 'Fellesperiode',
};

const typeColors: Record<QuotaUsage['type'], { bg: string; fill: string }> = {
  mother: { bg: 'bg-mother-light', fill: 'bg-mother-strong' },
  father: { bg: 'bg-father-light', fill: 'bg-father-strong' },
  shared: { bg: 'bg-shared-light', fill: 'bg-shared' },
};

export function QuotaSummary({ quotaUsage }: QuotaSummaryProps) {
  if (quotaUsage.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Kvotebruk</h4>
      <div className="space-y-2">
        {quotaUsage.map((usage) => {
          const percentage = Math.min(100, (usage.weeksUsed / usage.weeksAvailable) * 100);
          const colors = typeColors[usage.type];

          return (
            <div key={usage.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{typeLabels[usage.type]}</span>
                <span className={cn(usage.isOverbooked && 'text-destructive font-medium')}>
                  {usage.weeksUsed}/{usage.weeksAvailable} uker
                  {usage.isOverbooked && ' (!)'}
                </span>
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden', colors.bg)}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    colors.fill,
                    usage.isOverbooked && 'bg-destructive'
                  )}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              {usage.isOverbooked && (
                <p className="text-xs text-destructive">
                  Overskredet med {usage.weeksUsed - usage.weeksAvailable} uker
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
