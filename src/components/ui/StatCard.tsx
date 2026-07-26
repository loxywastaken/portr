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
  accent = 'text-brand-300',
  loading = false,
}: StatCardProps) {
  return (
    <GlassCard className="p-5 transition-colors duration-300 hover:border-white/20">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl bg-white/5', accent)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
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
