import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Save, Trash2, TrendingUp } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { ChannelPicker, MultiPicker, RolePicker } from '@/components/common/Pickers';
import { PremiumGate, PremiumTag } from '@/components/common/PremiumGate';
import { useLeveling, useUpdateLeveling, type LevelingSettings, type Multiplier } from '@/hooks/useFeatures';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import { extractApiError } from '@/lib/api';
import { formatNumber, initialsOf } from '@/lib/utils';
import { Select } from '@/components/ui/Select';

function Card({ title, tag, action, children }: { title: string; tag?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {title} {tag}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v.replace(/[^0-9]/g, '')) || 0));

function MultiplierList({
  guildId,
  kind,
  value,
  onChange,
}: {
  guildId: string;
  kind: 'role' | 'channel';
  value: Multiplier[];
  onChange: (v: Multiplier[]) => void;
}) {
  const { data: roles = [] } = useGuildRoles(guildId);
  const { data: channels = [] } = useGuildChannels(guildId);
  const items = kind === 'role' ? roles.map((r) => ({ id: r.id, name: `@ ${r.name}` })) : channels.map((c) => ({ id: c.id, name: `# ${c.name}` }));
  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={m.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{items.find((x) => x.id === m.id)?.name ?? 'Deleted'}</span>
          <Select
            value={String(m.multiplier)}
            onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, multiplier: Number(v) } : x)))}
            options={['0.5', '1.5', '2', '3', '5'].map((v) => ({ value: v, label: `${v}×` }))}
            className="w-24"
          />
          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Select
        value=""
        onChange={(id) => id && onChange([...value, { id, multiplier: 2 }])}
        className="w-full sm:w-60"
        options={[
          { value: '', label: kind === 'role' ? 'Add a role…' : 'Add a channel…' },
          ...items.filter((x) => !value.some((m) => m.id === x.id)).map((x) => ({ value: x.id, label: x.name })),
        ]}
      />
    </div>
  );
}

export default function Leveling() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useLeveling(guildId);
  const update = useUpdateLeveling(guildId);
  const toast = useToast();
  const [draft, setDraft] = useState<LevelingSettings | null>(null);

  useEffect(() => {
    if (data) setDraft(data.settings);
  }, [data]);

  const premium = data?.premium ?? false;
  const changes = useMemo(() => {
    if (!data || !draft) return {};
    const out: Partial<LevelingSettings> = {};
    for (const k of Object.keys(draft) as (keyof LevelingSettings)[]) {
      if (JSON.stringify(draft[k]) !== JSON.stringify(data.settings[k])) (out as Record<string, unknown>)[k] = draft[k];
    }
    return out;
  }, [data, draft]);
  const dirty = Object.keys(changes).length > 0;
  const set = (patch: Partial<LevelingSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    try {
      const patch = { ...changes };
      if (patch.roles) patch.roles = patch.roles.filter((r) => r.roleId);
      await update.mutateAsync(patch);
      toast('Leveling saved');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Leveling"
        description="Members earn XP for chatting and unlock roles as they level up."
        icon={TrendingUp}
        actions={
          <Button onClick={save} loading={update.isPending} disabled={!dirty}>
            <Save className="h-4 w-4" /> {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      {isLoading || !draft || !data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-8">
            <Card title="Basics">
              <GlassCard className="divide-y px-5">
                <Field label="Leveling" hint="Turn XP and level-ups on for this server.">
                  <Toggle checked={draft.enabled} onChange={(v) => set({ enabled: v })} aria-label="Leveling enabled" />
                </Field>
                <Field label="XP per message" hint="A random amount in this range.">
                  <div className="flex items-center gap-2">
                    <Input className="w-20 text-center" value={draft.minXp} onChange={(e) => set({ minXp: num(e.target.value, 1, 500) })} />
                    <span className="text-ink-faint">to</span>
                    <Input className="w-20 text-center" value={draft.maxXp} onChange={(e) => set({ maxXp: num(e.target.value, 1, 500) })} />
                  </div>
                </Field>
                <Field label="Cooldown" hint="Seconds between messages that earn XP.">
                  <Input className="w-24 text-center" value={draft.cooldownSeconds} onChange={(e) => set({ cooldownSeconds: num(e.target.value, 0, 3600) })} />
                </Field>
                <Field label="No XP in channels" hint="Messages here earn nothing." stacked>
                  <MultiPicker guildId={guildId} kind="channel" value={draft.ignoredChannelIds} onChange={(v) => set({ ignoredChannelIds: v })} addLabel="Add a channel…" />
                </Field>
                <Field label="No XP for roles" hint="Members with these roles earn nothing." stacked>
                  <MultiPicker guildId={guildId} kind="role" value={draft.noXpRoleIds} onChange={(v) => set({ noXpRoleIds: v })} addLabel="Add a role…" />
                </Field>
              </GlassCard>
            </Card>

            <Card title="Level-up message">
              <GlassCard className="divide-y px-5">
                <Field label="Announce level-ups">
                  <Toggle checked={draft.announce} onChange={(v) => set({ announce: v })} aria-label="Announce level-ups" />
                </Field>
                <Field label="Channel" hint="Off = the channel they were chatting in.">
                  <ChannelPicker guildId={guildId} value={draft.announceChannelId} onChange={(v) => set({ announceChannelId: v })} placeholder="Where they chatted" />
                </Field>
                <Field label="Message" hint="Use {user}, {username}, {level} and {server}." stacked>
                  <Textarea value={draft.levelUpMessage} maxLength={500} onChange={(e) => set({ levelUpMessage: e.target.value })} />
                </Field>
              </GlassCard>
            </Card>

            <Card
              title={`Role rewards (${draft.roles.length}/${data.maxRewards})`}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={draft.roles.length >= data.maxRewards}
                  onClick={() => {
                    const next = Math.max(0, ...draft.roles.map((r) => r.level)) + 5;
                    set({ roles: [...draft.roles, { level: next, roleId: '' }] });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add reward
                </Button>
              }
            >
              <GlassCard className="divide-y px-5">
                <Field label="Keep earlier rewards" hint="Off = members only wear their highest reward role.">
                  <Toggle checked={draft.stackRoles} onChange={(v) => set({ stackRoles: v })} aria-label="Stack reward roles" />
                </Field>
                {draft.roles.length === 0 && <p className="py-4 text-sm text-ink-muted">No rewards yet.</p>}
                {draft.roles.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 py-3">
                    <span className="text-sm text-ink-muted">Level</span>
                    <Input
                      className="w-20 text-center"
                      value={r.level}
                      onChange={(e) => set({ roles: draft.roles.map((x, j) => (j === i ? { ...x, level: num(e.target.value, 1, 1000) } : x)) })}
                    />
                    <span className="text-sm text-ink-muted">gives</span>
                    <RolePicker
                      guildId={guildId}
                      value={r.roleId || null}
                      placeholder="Pick a role"
                      className="sm:w-56"
                      onChange={(v) => set({ roles: draft.roles.map((x, j) => (j === i ? { ...x, roleId: v ?? '' } : x)) })}
                    />
                    <Button variant="ghost" size="icon" aria-label="Remove reward" onClick={() => set({ roles: draft.roles.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </GlassCard>
              {!premium && <p className="mt-2 text-xs text-ink-faint">Free servers get 5 rewards. Premium gets 25.</p>}
            </Card>

            <Card title="Boosts" tag={<PremiumTag />}>
              <PremiumGate premium={premium} note="XP boosts, voice XP and images need Premium">
                <GlassCard className="divide-y px-5">
                  <Field label="Role multipliers" hint="Members with these roles earn more (or less) XP. Highest applies." stacked>
                    <MultiplierList guildId={guildId} kind="role" value={draft.roleMultipliers} onChange={(v) => set({ roleMultipliers: v })} />
                  </Field>
                  <Field label="Channel multipliers" hint="Chatting in these channels earns more (or less) XP." stacked>
                    <MultiplierList guildId={guildId} kind="channel" value={draft.channelMultipliers} onChange={(v) => set({ channelMultipliers: v })} />
                  </Field>
                  <Field label="Voice XP" hint="Earn XP for time in voice with others (not deafened or AFK).">
                    <div className="flex items-center gap-3">
                      <Input
                        className="w-16 text-center"
                        value={draft.voiceXpPerMinute}
                        onChange={(e) => set({ voiceXpPerMinute: num(e.target.value, 1, 50) })}
                        aria-label="XP per minute"
                      />
                      <span className="text-xs text-ink-faint">XP / min</span>
                      <Toggle checked={draft.voiceXpEnabled} onChange={(v) => set({ voiceXpEnabled: v })} aria-label="Voice XP" />
                    </div>
                  </Field>
                  <Field label="Level-up image" hint="Image URL shown in the level-up message." stacked>
                    <Input
                      value={draft.levelUpImageUrl ?? ''}
                      placeholder="https://…"
                      onChange={(e) => set({ levelUpImageUrl: e.target.value.trim() || null })}
                    />
                  </Field>
                </GlassCard>
              </PremiumGate>
            </Card>
          </div>

          <Card title="Leaderboard">
            <GlassCard className="divide-y">
              {(data.leaderboard ?? []).length === 0 && <p className="p-5 text-sm text-ink-muted">No one has earned XP yet.</p>}
              {(data.leaderboard ?? []).map((u) => (
                <div key={u.userId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 text-right text-xs text-ink-faint">{u.rank}</span>
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[10px] font-semibold">{initialsOf(u.name)}</div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                  <span className="text-right text-xs">
                    <span className="font-medium">Lv {u.level}</span>
                    <span className="block text-ink-faint">{formatNumber(u.xp)} XP</span>
                  </span>
                </div>
              ))}
            </GlassCard>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}
