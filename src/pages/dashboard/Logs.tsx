import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScrollText, Search } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { PremiumGate, PremiumTag } from '@/components/common/PremiumGate';
import { useConfig, useLogs, type LogKind } from '@/hooks/useFeatures';
import { useGuildChannels } from '@/hooks/useGuild';
import { formatRelativeTime } from '@/lib/utils';

const KINDS: { value: LogKind | ''; label: string }[] = [
  { value: '', label: 'All events' },
  { value: 'message_delete', label: 'Deleted messages' },
  { value: 'message_edit', label: 'Edited messages' },
  { value: 'member_join', label: 'Joins' },
  { value: 'member_leave', label: 'Leaves' },
  { value: 'member_roles', label: 'Role changes' },
  { value: 'member_nickname', label: 'Nickname changes' },
  { value: 'ban', label: 'Bans' },
  { value: 'unban', label: 'Unbans' },
];
const label = (k: LogKind) => KINDS.find((x) => x.value === k)?.label.replace(/s$/, '') ?? k;

export default function Logs() {
  const { guildId = '' } = useParams();
  const config = useConfig(guildId);
  const premium = config.data?.premium ?? false;
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const { data: channels = [] } = useGuildChannels(guildId);
  const logs = useLogs(guildId, { q: query, kind }, premium);

  // Search after typing pauses.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const anyLogChannel =
    config.data && Object.values(config.data.logging).some(Boolean);

  return (
    <PageTransition>
      <PageHeader
        title="Logs"
        description="Search 30 days of deleted and edited messages, joins, leaves and member changes."
        icon={ScrollText}
        actions={<PremiumTag />}
      />

      {config.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <PremiumGate premium={premium} note="Log search needs Premium">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text or username" className="pl-9" />
            </div>
            <Select value={kind} onChange={setKind} options={KINDS} className="sm:w-56" />
          </div>

          {!anyLogChannel && (
            <p className="mb-4 text-xs text-ink-faint">
              Tip: also pick log channels in <Link to={`/dashboard/${guildId}/settings`} className="underline">Settings</Link> to get these events posted in Discord.
            </p>
          )}

          <GlassCard className="divide-y">
            {(logs.isLoading || !premium) &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            {premium && logs.data?.entries.length === 0 && (
              <p className="p-10 text-center text-sm text-ink-muted">Nothing logged yet{query || kind ? ' for this search' : ''}.</p>
            )}
            {logs.data?.entries.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                <div className="shrink-0 text-xs text-ink-faint sm:w-32">
                  {formatRelativeTime(e.createdAt)}
                  <div className="text-ink-muted">{label(e.kind)}</div>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div>
                    <span className="font-medium">{e.userTag ?? 'Unknown user'}</span>
                    {e.channelId && (
                      <span className="text-ink-faint"> in # {channels.find((c) => c.id === e.channelId)?.name ?? 'channel'}</span>
                    )}
                  </div>
                  {e.before && <div className="mt-1 break-words text-ink-faint line-through">{e.before}</div>}
                  {e.content && <div className="mt-1 whitespace-pre-wrap break-words text-ink-muted">{e.content}</div>}
                </div>
              </div>
            ))}
          </GlassCard>
          {logs.data?.hasMore && <p className="mt-2 text-xs text-ink-faint">Showing the latest 50 — search to narrow it down.</p>}
        </PremiumGate>
      )}
    </PageTransition>
  );
}
