import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('glass-raised rounded-2xl', className)} {...props} />
  ),
);
GlassCard.displayName = 'GlassCard';
