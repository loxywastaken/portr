import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Crown, MessageSquare, Search, Trophy, Users } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { BarBreakdown } from '@/components/charts/BarBreakdown';
import { useUserStats, type LeaderEntry } from '@/hooks/useUserStats';
import { getSocket } from '@/lib/socket';
import { cn, formatNumber, formatRelativeTime, userAvatarUrl } from '@/lib/utils';

/** A small pill reflecting the live Socket.IO connection (stats update in realtime). */
function LiveBadge() {
  const [live, setLive] = useState(() => getSocket().connected);
  useEffect(() => {
    const socket = getSocket();
    const on = () => setLive(true);
    const off = () => setLive(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    setLive(socket.connected);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, []);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        live ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-ink-faint',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-emerald-400' : 'bg-ink-faint')} />
      {live ? 'Live' : 'Offline'}
    </span>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-lg leading-none">{MEDALS[rank - 1]}</span>;
  return <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink-faint">#{rank}</span>;
}

function LeaderRow({ entry }: { entry: LeaderEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <RankBadge rank={entry.rank} />
      <img
        src={userAvatarUrl({ id: entry.userId, avatar: entry.avatar })}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full bg-white/5"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{entry.displayName}</div>
        <div className="truncate text-xs text-ink-faint">
          @{entry.username}
          {entry.lastMessageAt ? ` · active ${formatRelativeTime(entry.lastMessageAt)}` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold tabular-nums">{formatNumber(entry.messages)}</div>
        <div className="text-[11px] text-ink-faint">messages</div>
      </div>
    </div>
  );
}

export default function UserStats() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useUserStats(guildId);
  const [query, setQuery] = useState('');

  const board = data?.leaderboard ?? [];
  const daily = data?.daily ?? [];
  const topChatter = board[0];
  const messagesToday = daily.length ? daily[daily.length - 1]!.count : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return board;
    return board.filter((e) => e.displayName.toLowerCase().includes(q) || e.username.toLowerCase().includes(q));
  }, [board, query]);

  return (
    <PageTransition>
      <PageHeader
        title="User Stats"
        description="Message activity across your server — who's talking and how much."
        icon={Trophy}
        actions={<LiveBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Total messages"
          value={data ? formatNumber(data.totals.totalMessages) : '—'}
          loading={isLoading}
        />
        <StatCard
          icon={Users}
          label="Members tracked"
          value={data ? formatNumber(data.totals.trackedMembers) : '—'}
          loading={isLoading}
        />
        <StatCard
          icon={Crown}
          label="Top chatter"
          accent="text-amber-300"
          value={topChatter ? topChatter.displayName : '—'}
          hint={topChatter ? `${formatNumber(topChatter.messages)} messages` : undefined}
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Messages today"
          accent="text-emerald-300"
          value={data ? formatNumber(messagesToday) : '—'}
          loading={isLoading}
        />
      </div>

      <GlassCard className="mt-4 p-5">
        <h3 className="mb-4 font-semibold">Message activity (14 days)</h3>
        {data ? (
          <AreaTrend data={data.daily} valueSuffix="msgs" />
        ) : (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        )}
      </GlassCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Leaderboard</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members…"
                  className="w-56 pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length ? (
              <div className="space-y-2">
                {filtered.map((entry) => (
                  <LeaderRow key={entry.userId} entry={entry} />
                ))}
              </div>
            ) : board.length ? (
              <p className="py-8 text-center text-sm text-ink-faint">No members match “{query}”.</p>
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">
                No messages tracked yet. Once people start chatting, they'll show up here.
              </p>
            )}
          </GlassCard>
        </div>

        <div>
          <GlassCard className="p-5">
            <h3 className="mb-4 font-semibold">Top 10</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <BarBreakdown
                items={board.slice(0, 10).map((e) => ({ label: e.displayName, value: e.messages }))}
                emptyLabel="No messages tracked yet."
              />
            )}
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
