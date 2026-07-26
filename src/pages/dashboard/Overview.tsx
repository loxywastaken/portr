import { useParams } from 'react-router-dom';
import { Activity, Clock, Cpu, Database, Gauge, MemoryStick, Terminal, Users } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { useGuildOverview } from '@/hooks/useGuild';
import { useSystemStats } from '@/hooks/useStats';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatDuration, formatNumber } from '@/lib/utils';

export default function Overview() {
  const { guildId = '' } = useParams();
  const overview = useGuildOverview(guildId);
  const { stats } = useSystemStats();
  const analytics = useAnalytics(guildId);

  const o = overview.data;
  const loadingStats = !stats;

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          A live snapshot of {o?.name ?? 'your server'} and the bot.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Members"
          value={o ? formatNumber(o.memberCount) : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Activity}
          label="Online now"
          accent="text-emerald-300"
          value={o && o.onlineCount != null ? formatNumber(o.onlineCount) : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Gauge}
          label="Bot ping"
          value={stats ? `${stats.bot.ping} ms` : '—'}
          loading={loadingStats}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={stats ? formatDuration(stats.bot.uptimeMs) : '—'}
          loading={loadingStats}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Cpu}
          label="CPU usage"
          value={stats ? `${stats.system.cpu.usagePercent}%` : '—'}
          hint={stats ? `${stats.system.cpu.cores} cores` : undefined}
          loading={loadingStats}
        />
        <StatCard
          icon={MemoryStick}
          label="Memory (RSS)"
          value={stats ? `${stats.system.memory.rssMb} MB` : '—'}
          hint={stats ? `system ${stats.system.memory.systemUsedPercent}%` : undefined}
          loading={loadingStats}
        />
        <StatCard
          icon={Database}
          label="Database"
          accent={stats?.database.ok ? 'text-emerald-300' : 'text-red-300'}
          value={stats ? (stats.database.ok ? 'Connected' : 'Offline') : '—'}
          loading={loadingStats}
        />
        <StatCard
          icon={Terminal}
          label="Commands run"
          value={stats ? formatNumber(stats.commands.total) : '—'}
          loading={loadingStats}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Command activity</h3>
            <span className="text-xs text-ink-faint">last 14 days</span>
          </div>
          {analytics.data ? (
            <AreaTrend data={analytics.data.commandsDaily} valueSuffix="cmds" />
          ) : (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Top commands</h3>
          {analytics.data ? (
            <BarBreakdown
              items={analytics.data.commandBreakdown.map((c) => ({
                label: `/${c.name}`,
                value: c.count,
              }))}
              emptyLabel="No commands used yet."
            />
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
