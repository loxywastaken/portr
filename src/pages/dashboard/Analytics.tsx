import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, BarChart3, Crown, ShieldAlert, Terminal, Users } from 'lucide-react';
import { useActivity } from '@/hooks/useFeatures';
import { cn } from '@/lib/utils';
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

const RANGES = [14, 30, 90];

/** Messages, joins and leaves over 14 / 30 / 90 days (30 and 90 need Premium). */
function ServerActivity({ guildId }: { guildId: string }) {
  const [days, setDays] = useState(14);
  const navigate = useNavigate();
  const { data } = useActivity(guildId, days);
  const premium = data?.premium ?? false;
  const t = data?.totals;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Server activity</h2>
        <div className="inline-flex rounded-lg border p-0.5 text-sm">
          {RANGES.map((d) => {
            const locked = d > (data?.maxDays ?? 14);
            return (
              <button
                key={d}
                onClick={() => (locked ? navigate(`/dashboard/${guildId}/premium`) : setDays(d))}
                title={locked ? 'Premium' : undefined}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors',
                  days === d ? 'bg-white/[0.08] font-medium text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {d}d {locked && <Crown className="h-3 w-3 text-amber-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-white/[0.08] lg:grid-cols-4">
        {[
          ['Messages', t?.messages],
          ['Joins', t?.joins],
          ['Leaves', t?.leaves],
          ['Net growth', data ? data.netGrowth : undefined],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-surface-soft p-5">
            <div className="text-xs text-ink-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {value === undefined ? '—' : `${label === 'Net growth' && (value as number) > 0 ? '+' : ''}${formatNumber(value as number)}`}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title={`Messages (${days}d)`}>
          {data ? (
            <AreaTrend data={data.daily.map((d) => ({ date: d.date, count: d.messages }))} valueSuffix="msgs" />
          ) : (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          )}
        </ChartCard>
        <ChartCard title={`Joins and leaves (${days}d)`}>
          {data ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-xs text-ink-faint">Joins</div>
                <AreaTrend data={data.daily.map((d) => ({ date: d.date, count: d.joins }))} color="#6ee7b7" height={200} valueSuffix="joins" />
              </div>
              <div>
                <div className="mb-1 text-xs text-ink-faint">Leaves</div>
                <AreaTrend data={data.daily.map((d) => ({ date: d.date, count: d.leaves }))} color="#fca5a5" height={200} valueSuffix="leaves" />
              </div>
            </div>
          ) : (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          )}
        </ChartCard>
      </div>
      {!premium && <p className="mt-2 text-xs text-ink-faint">Joins and leaves are counted from today. Premium shows up to 90 days.</p>}
    </section>
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

      <ServerActivity guildId={guildId} />

      <h2 className="mb-3 mt-10 text-sm font-semibold">Commands & moderation</h2>
      <div className="grid gap-4 lg:grid-cols-2">
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
