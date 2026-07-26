import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'brand' | 'success' | 'danger' | 'warning';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-ink-muted',
  brand: 'bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/25',
  danger: 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/25',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
