import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Plus, RotateCcw, Square } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels } from '@/hooks/useGuild';
import {
  useCreateGiveaway,
  useEndGiveaway,
  useGiveaways,
  useRerollGiveaway,
  type Giveaway,
} from '@/hooks/useGiveaways';
import { extractApiError } from '@/lib/api';

const UNITS = [
  { value: '60000', label: 'minutes' },
  { value: '3600000', label: 'hours' },
  { value: '86400000', label: 'days' },
  { value: '604800000', label: 'weeks' },
];

function endsLabel(g: Giveaway): string {
  const diff = new Date(g.endsAt).getTime() - Date.now();
  if (g.ended) return 'Ended';
  if (diff <= 0) return 'Ending…';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function Giveaways() {
  const { guildId = '' } = useParams();
  const giveaways = useGiveaways(guildId);
  const channels = useGuildChannels(guildId);
  const create = useCreateGiveaway(guildId);
  const end = useEndGiveaway(guildId);
  const reroll = useRerollGiveaway(guildId);
  const toast = useToast();

  const [prize, setPrize] = useState('');
  const [winners, setWinners] = useState('1');
  const [durValue, setDurValue] = useState('1');
  const [durUnit, setDurUnit] = useState('3600000');
  const [channelId, setChannelId] = useState('');

  const channelOpts = [{ value: '', label: '— select a channel —' }, ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))];

  const onCreate = async () => {
    if (!prize.trim()) return toast('Enter a prize.', 'error');
    if (!channelId) return toast('Pick a channel.', 'error');
    const durationMs = Math.round(Number(durValue) * Number(durUnit));
    if (!durationMs || durationMs < 10_000) return toast('Enter a valid duration.', 'error');
    try {
      await create.mutateAsync({ channelId, prize: prize.trim(), winnerCount: Math.max(1, Number(winners) || 1), durationMs });
      toast('Giveaway started! 🎉');
      setPrize('');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onEnd = async (id: string) => {
    try {
      await end.mutateAsync(id);
      toast('Giveaway ended.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onReroll = async (id: string) => {
    try {
      await reroll.mutateAsync(id);
      toast('Rerolled — new winners drawn.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader title="Giveaways" description="Run giveaways members enter with a click." icon={Gift} />

      <div className="grid gap-4">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold">New giveaway</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Prize" hint="What are you giving away?">
              <Input value={prize} maxLength={200} onChange={(e) => setPrize(e.target.value)} className="w-full max-w-md" placeholder="Nitro, a game key, a role…" />
            </Field>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Winners">
                <Input value={winners} onChange={(e) => setWinners(e.target.value.replace(/[^0-9]/g, ''))} className="w-24" placeholder="1" />
              </Field>
              <Field label="Duration">
                <div className="flex items-center gap-2">
                  <Input value={durValue} onChange={(e) => setDurValue(e.target.value.replace(/[^0-9]/g, ''))} className="w-20" placeholder="1" />
                  <Select value={durUnit} onChange={setDurUnit} options={UNITS} className="w-32" />
                </div>
              </Field>
              <Field label="Channel">
                <Select value={channelId} onChange={setChannelId} options={channelOpts} className="w-56" />
              </Field>
            </div>
            <div>
              <Button onClick={onCreate} loading={create.isPending}>
                <Plus className="h-4 w-4" /> Start giveaway
              </Button>
            </div>
          </div>
        </GlassCard>

        <div>
          <h2 className="mb-3 text-base font-semibold">Giveaways</h2>
          {giveaways.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : giveaways.data && giveaways.data.length === 0 ? (
            <GlassCard className="flex flex-col items-center gap-2 p-10 text-center">
              <Gift className="h-8 w-8 text-ink-faint" />
              <p className="text-ink-muted">No giveaways yet. Start one above.</p>
            </GlassCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {giveaways.data?.map((g) => (
                <GlassCard key={g.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold">🎉 {g.prize}</span>
                    {g.ended ? <Badge variant="danger">Ended</Badge> : <Badge variant="success">Live</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
                    <span>{g.winnerCount} winner{g.winnerCount === 1 ? '' : 's'}</span>
                    <span>{g.entrantCount} entries</span>
                    <span>{endsLabel(g)}</span>
                    <a className="text-ink-muted underline decoration-white/20 hover:text-ink" href={`https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId}`} target="_blank" rel="noreferrer">
                      jump
                    </a>
                  </div>
                  {g.ended && g.winners.length > 0 && (
                    <p className="mt-2 text-xs text-ink-muted">Winners: {g.winners.map((w) => `@${w}`).join(', ')}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    {!g.ended ? (
                      <Button variant="secondary" size="sm" onClick={() => onEnd(g.id)} loading={end.isPending}>
                        <Square className="h-4 w-4" /> End now
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => onReroll(g.id)} loading={reroll.isPending}>
                        <RotateCcw className="h-4 w-4" /> Reroll
                      </Button>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
