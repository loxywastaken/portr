import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, BarChart3, ShieldAlert, Terminal, Users } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatNumber } from '@/lib/utils';
import type { ModerationActionType } from '@/types';

const ACTION_LABELS: Record<ModerationActionType, string> = {
  ban: 'Bans',
  unban: 'Unbans',
  kick: 'Kicks',
  timeout: 'Timeouts',
  warn: 'Warns',
  clear: 'Purges',
  slowmode: 'Slowmode',
  lock: 'Locks',
  unlock: 'Unlocks',
};

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </GlassCard>
  );
}

export default function Analytics() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useAnalytics(guildId);

  return (
    <PageTransition>
      <PageHeader
        title="Analytics"
        description="Command usage and moderation trends across your server."
        icon={BarChart3}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Members"
          value={data ? formatNumber(data.totals.members) : '—'}
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Online now"
          accent="text-emerald-300"
          value={data && data.totals.online != null ? formatNumber(data.totals.online) : '—'}
          loading={isLoading}
        />
        <StatCard
          icon={Terminal}
          label="Commands"
          value={data ? formatNumber(data.totals.commands) : '—'}
          loading={isLoading}
        />
        <StatCard
          icon={ShieldAlert}
          label="Mod cases"
          accent="text-amber-300"
          value={data ? formatNumber(data.totals.moderationCases) : '—'}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Command activity (14d)">
          {data ? (
            <AreaTrend data={data.commandsDaily} valueSuffix="cmds" />
          ) : (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          )}
        </ChartCard>

        <ChartCard title="Moderation activity (14d)">
          {data ? (
            <AreaTrend data={data.moderationDaily} color="#fbbf24" valueSuffix="cases" />
          ) : (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          )}
        </ChartCard>

        <ChartCard title="Top commands">
          {data ? (
            <BarBreakdown
              items={data.commandBreakdown.map((c) => ({ label: `/${c.name}`, value: c.count }))}
              emptyLabel="No commands used yet."
            />
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Moderation by type">
          {data ? (
            <BarBreakdown
              color="#fbbf24"
              items={data.moderationBreakdown.map((a) => ({
                label: ACTION_LABELS[a.action] ?? a.action,
                value: a.count,
              }))}
              emptyLabel="No moderation actions yet."
            />
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </PageTransition>
  );
}
