import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
}

export function Field({ label, hint, children, stacked = false }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2 py-4', !stacked && 'sm:flex-row sm:items-center sm:justify-between')}>
      <div className={cn(!stacked && 'sm:pr-6')}>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
      </div>
      <div className={cn(stacked ? 'min-w-0 w-full' : 'shrink-0')}>{children}</div>
    </div>
  );
}
