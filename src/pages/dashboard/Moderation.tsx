import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gavel, Send } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useModerationAction,
  useModerationCases,
  type ModerationActionPayload,
} from '@/hooks/useModeration';
import { useGuildChannels } from '@/hooks/useGuild';
import { extractApiError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import type { ModerationActionType } from '@/types';

const ACTION_OPTIONS = [
  { value: 'ban', label: 'Ban' },
  { value: 'kick', label: 'Kick' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'warn', label: 'Warn' },
  { value: 'unban', label: 'Unban' },
  { value: 'clear', label: 'Clear messages' },
  { value: 'slowmode', label: 'Slowmode' },
  { value: 'lock', label: 'Lock channel' },
  { value: 'unlock', label: 'Unlock channel' },
];

const USER_ACTIONS = new Set(['ban', 'kick', 'timeout', 'warn', 'unban']);
const CHANNEL_ACTIONS = new Set(['clear', 'slowmode', 'lock', 'unlock']);

function badgeVariant(action: ModerationActionType) {
  if (action === 'ban' || action === 'kick') return 'danger' as const;
  if (action === 'timeout' || action === 'warn' || action === 'slowmode' || action === 'lock')
    return 'warning' as const;
  if (action === 'unban' || action === 'unlock') return 'success' as const;
  return 'default' as const;
}

function parseDurationMs(input: string): number | null {
  const match = /^(\d+)\s*(s|m|h|d|w)$/i.exec(input.trim());
  if (!match) return null;
  const mult: Record<string, number> = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };
  const ms = Number(match[1]) * (mult[match[2]!.toLowerCase()] ?? 0);
  return ms > 0 ? ms : null;
}

const labelClass = 'mb-1.5 block text-sm text-ink-muted';

export default function Moderation() {
  const { guildId = '' } = useParams();
  const casesQuery = useModerationCases(guildId, 25);
  const channels = useGuildChannels(guildId);
  const run = useModerationAction(guildId);
  const toast = useToast();

  const [action, setAction] = useState<ModerationActionType>('ban');
  const [targetId, setTargetId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('10m');
  const [amount, setAmount] = useState('10');
  const [seconds, setSeconds] = useState('5');

  const channelOptions = (channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }));

  function buildPayload(): ModerationActionPayload | null {
    if (USER_ACTIONS.has(action) && !/^\d{16,20}$/.test(targetId)) return null;
    if (CHANNEL_ACTIONS.has(action) && !/^\d{16,20}$/.test(channelId)) return null;

    switch (action) {
      case 'ban':
        return { action: 'ban', targetId, reason: reason || undefined };
      case 'kick':
        return { action: 'kick', targetId, reason: reason || undefined };
      case 'unban':
        return { action: 'unban', targetId, reason: reason || undefined };
      case 'warn':
        return { action: 'warn', targetId, reason: reason || 'No reason provided' };
      case 'timeout': {
        const durationMs = parseDurationMs(duration);
        if (!durationMs) return null;
        return { action: 'timeout', targetId, durationMs, reason: reason || undefined };
      }
      case 'clear': {
        const n = Number(amount);
        if (!Number.isInteger(n) || n < 1 || n > 100) return null;
        return { action: 'clear', channelId, amount: n };
      }
      case 'slowmode': {
        const s = Number(seconds);
        if (!Number.isInteger(s) || s < 0 || s > 21_600) return null;
        return { action: 'slowmode', channelId, seconds: s };
      }
      case 'lock':
        return { action: 'lock', channelId, reason: reason || undefined };
      case 'unlock':
        return { action: 'unlock', channelId, reason: reason || undefined };
      default:
        return null;
    }
  }

  const submit = async () => {
    const payload = buildPayload();
    if (!payload) {
      toast('Please complete the required fields correctly.', 'error');
      return;
    }
    try {
      const created = await run.mutateAsync(payload);
      toast(`Case #${created.caseNumber} — ${action} applied.`);
      setTargetId('');
      setReason('');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const showReason = USER_ACTIONS.has(action) || action === 'lock' || action === 'unlock';

  return (
    <PageTransition>
      <PageHeader
        title="Moderation"
        description="Take action and review your server's case history."
        icon={Gavel}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="font-semibold">Quick action</h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass}>Action</label>
              <Select
                value={action}
                onChange={(v) => setAction(v as ModerationActionType)}
                options={ACTION_OPTIONS}
              />
            </div>

            {USER_ACTIONS.has(action) && (
              <div>
                <label className={labelClass}>User ID</label>
                <Input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value.trim())}
                  placeholder="123456789012345678"
                  inputMode="numeric"
                />
              </div>
            )}

            {CHANNEL_ACTIONS.has(action) && (
              <div>
                <label className={labelClass}>Channel</label>
                <Select
                  value={channelId}
                  onChange={setChannelId}
                  options={channelOptions}
                  placeholder={channels.isLoading ? 'Loading…' : 'Select a channel'}
                />
              </div>
            )}

            {action === 'timeout' && (
              <div>
                <label className={labelClass}>Duration</label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="10m · 1h · 7d"
                />
              </div>
            )}

            {action === 'clear' && (
              <div>
                <label className={labelClass}>Amount (1–100)</label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
              </div>
            )}

            {action === 'slowmode' && (
              <div>
                <label className={labelClass}>Seconds (0–21600)</label>
                <Input
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            )}

            {showReason && (
              <div>
                <label className={labelClass}>Reason</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                />
              </div>
            )}

            <Button className="w-full" onClick={submit} loading={run.isPending}>
              <Send className="h-4 w-4" /> Apply action
            </Button>
            <p className="text-xs text-ink-faint">
              Actions run through the bot and respect Discord&apos;s role hierarchy &amp; permissions.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent cases</h3>
            {casesQuery.data && (
              <span className="text-xs text-ink-faint">{casesQuery.data.total} total</span>
            )}
          </div>

          {casesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : casesQuery.data && casesQuery.data.cases.length > 0 ? (
            <div className="space-y-2">
              {casesQuery.data.cases.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-semibold text-ink-muted">
                    {c.caseNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(c.action)}>{c.action}</Badge>
                      <span className="truncate text-sm">{c.targetTag ?? c.targetId ?? '—'}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-faint">
                      {c.reason} · by {c.moderatorTag}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {formatRelativeTime(c.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-faint">No moderation cases yet.</p>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
