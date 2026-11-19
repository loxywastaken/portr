import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { Skeleton } from './Skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
  loading?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'text-ink-muted',
  loading = false,
}: StatCardProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">{label}</span>
        <Icon className={cn('h-4 w-4 opacity-70', accent)} strokeWidth={2} />
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-8 w-24" />
      ) : (
        <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      )}
      {hint && !loading ? <div className="mt-1 text-xs text-ink-faint">{hint}</div> : null}
    </GlassCard>
  );
}
