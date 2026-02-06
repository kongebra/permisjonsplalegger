import { cn } from '@/lib/utils';
import { Info, Lightbulb, AlertTriangle } from 'lucide-react';

const variants = {
  info: {
    container: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)]',
    icon: Info,
  },
  tip: {
    container: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)]',
    icon: Lightbulb,
  },
  warning: {
    container: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)] border border-[var(--color-warning-bg)]',
    icon: AlertTriangle,
  },
} as const;

interface InfoBoxProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function InfoBox({ variant = 'info', children, className }: InfoBoxProps) {
  const { container, icon: Icon } = variants[variant];

  return (
    <div className={cn('rounded-lg px-3 py-2.5 flex gap-2.5', container, className)}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="text-xs">{children}</div>
    </div>
  );
}
