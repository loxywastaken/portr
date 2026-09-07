import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Save, Lock, Unlock, RefreshCw } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import {
  useAntiRaid,
  useAntiRaidStatus,
  useSaveAntiRaid,
  useAntiRaidLockdown,
  type AntiRaidConfig,
  type ModuleKey,
} from '@/hooks/useAntiRaid';
import { extractApiError } from '@/lib/api';

type NumericField = { key: string; label: string; min: number; max: number; hint?: string };
const definitions: Record<
  ModuleKey,
  {
    title: string;
    description: string;
    fields: NumericField[];
    actions: { value: string; label: string }[];
  }
> = {
  joinRaid: {
    title: 'Join raid detection',
    description: 'Detect bursts of suspicious joins and respond to the recent arrivals.',
    actions: [
      { value: 'kick', label: 'Kick' },
      { value: 'ban', label: 'Ban' },
      { value: 'timeout', label: 'Timeout' },
    ],
    fields: [
      { key: 'joinThreshold', label: 'Join threshold', min: 3, max: 50 },
      { key: 'timeWindow', label: 'Join window (seconds)', min: 5, max: 300 },
      { key: 'minAccountAge', label: 'Minimum account age (hours)', min: 1, max: 8760 },
      { key: 'actionDuration', label: 'Timeout duration (minutes)', min: 1, max: 40320 },
      { key: 'lockdownDuration', label: 'Automatic lockdown (minutes)', min: 1, max: 1440 },
      { key: 'noAvatarScore', label: 'No avatar score', min: 0, max: 1000 },
      { key: 'newAccountScore', label: 'New account score', min: 0, max: 1000 },
      { key: 'joinBurstScore', label: 'Join burst score', min: 0, max: 1000 },
      {
        key: 'scoreLimit',
        label: 'Score needed to trigger',
        min: 1,
        max: 3000,
        hint: 'A raid triggers when both the join threshold and this score are reached.',
      },
    ],
  },
  antiNuke: {
    title: 'Anti-nuke protection',
    description: 'Catch destructive actions by a user within the selected time window.',
    actions: [
      { value: 'stripRoles', label: 'Strip roles' },
      { value: 'ban', label: 'Ban' },
      { value: 'kick', label: 'Kick' },
    ],
    fields: [
      { key: 'banLimit', label: 'Ban threshold', min: 1, max: 20 },
      { key: 'kickLimit', label: 'Kick threshold', min: 1, max: 20 },
      { key: 'channelDeleteLimit', label: 'Channel deletion threshold', min: 1, max: 10 },
      { key: 'roleDeleteLimit', label: 'Role deletion threshold', min: 1, max: 100 },
      { key: 'webhookCreateLimit', label: 'Webhook creation threshold', min: 1, max: 100 },
      { key: 'timeWindow', label: 'Action window (seconds)', min: 1, max: 3600 },
    ],
  },
  antiSpam: {
    title: 'Anti-spam',
    description: 'Detect rapid messages, repeated content, and excessive mentions.',
    actions: [
      { value: 'timeout', label: 'Timeout' },
      { value: 'kick', label: 'Kick' },
      { value: 'ban', label: 'Ban' },
      { value: 'delete', label: 'Delete only' },
    ],
    fields: [
      { key: 'messageLimit', label: 'Message threshold', min: 3, max: 30 },
      { key: 'timeWindow', label: 'Message window (seconds)', min: 2, max: 60 },
      { key: 'duplicateLimit', label: 'Repeated message threshold', min: 1, max: 100 },
      { key: 'mentionLimit', label: 'Mentions per message', min: 2, max: 50 },
      { key: 'massMentionLimit', label: '@everyone / @here messages per window', min: 1, max: 100 },
      { key: 'actionDuration', label: 'Timeout duration (minutes)', min: 1, max: 40320 },
    ],
  },
};
type Draft = Record<string, string | boolean | string[] | null>;
const toDraft = (config: AntiRaidConfig[ModuleKey]): Draft =>
  Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      typeof value === 'number' ? String(value) : value,
    ]),
  );
const idList = (value: string) => [...new Set(value.split(/[\s,]+/).filter(Boolean))];

function ModuleForm({
  guildId,
  module,
  config,
}: {
  guildId: string;
  module: ModuleKey;
  config: AntiRaidConfig[ModuleKey];
}) {
  const definition = definitions[module];
  const [draft, setDraft] = useState(() => toDraft(config));
  const [baseline, setBaseline] = useState(config);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState(
    module === 'antiNuke' ? (config as AntiRaidConfig['antiNuke']).whitelistedUsers.join('\n') : '',
  );
  const save = useSaveAntiRaid(guildId, module);
  const toast = useToast();
  const channels = useGuildChannels(guildId);
  const roles = useGuildRoles(guildId);
  useEffect(() => {
    if (!dirty) {
      setDraft(toDraft(config));
      setBaseline(config);
      if (module === 'antiNuke')
        setUsers((config as AntiRaidConfig['antiNuke']).whitelistedUsers.join('\n'));
    }
  }, [config, dirty, module]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const patch = (key: string, value: Draft[string]) => {
    setDraft((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setError('');
  };
  const text = (key: string) => String(draft[key] ?? '');
  const options = (kind: 'channel' | 'role', current: string) => {
    const list =
      kind === 'channel'
        ? (channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))
        : (roles.data ?? []).map((r) => ({ value: r.id, label: r.name }));
    if (current && !list.some((item) => item.value === current))
      list.push({ value: current, label: `Current: ${current}` });
    return [{ value: '', label: 'None' }, ...list];
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: Record<string, unknown> = { enabled: draft.enabled, action: draft.action };
    for (const field of definition.fields) {
      const value = Number(draft[field.key]);
      if (
        !text(field.key).trim() ||
        !Number.isInteger(value) ||
        value < field.min ||
        value > field.max
      ) {
        setError(`${field.label} must be a whole number from ${field.min} to ${field.max}.`);
        return;
      }
      values[field.key] = value;
    }
    if (module !== 'antiSpam') {
      values.alertChannelId = draft.alertChannelId || null;
      values.alertRoleId = draft.alertRoleId || null;
    }
    if (module === 'joinRaid') values.autoLockdown = draft.autoLockdown;
    if (module === 'antiNuke') {
      const ids = idList(users);
      if (ids.some((id) => !/^\d{17,20}$/.test(id))) {
        setError('Enter valid Discord user IDs, separated by commas or new lines.');
        return;
      }
      values.whitelistedUsers = ids;
    }
    if (module !== 'joinRaid') values.whitelistedRoles = draft.whitelistedRoles;
    if (module === 'antiSpam') values.whitelistedChannels = draft.whitelistedChannels;
    // Send only changed fields so an unrelated setting changed through Discord is preserved.
    const changes = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) =>
          JSON.stringify(value) !==
          JSON.stringify((baseline as unknown as Record<string, unknown>)[key]),
      ),
    );
    if (!Object.keys(changes).length) {
      setDirty(false);
      return;
    }
    try {
      await save.mutateAsync(changes);
      setDirty(false);
      setError('');
      toast(`${definition.title} saved`);
    } catch (err) {
      setError(extractApiError(err).message);
    }
  }
  const exclusions = (
    key: 'whitelistedRoles' | 'whitelistedChannels',
    kind: 'channel' | 'role',
    label: string,
  ) => {
    const selected = (draft[key] as string[]) ?? [];
    const list = options(kind, '').filter((o) => o.value);
    for (const id of selected)
      if (!list.some((o) => o.value === id)) list.push({ value: id, label: id });
    return (
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">{label}</legend>
        <p className="mt-1 text-sm text-ink-muted">
          Selected {kind === 'role' ? 'roles' : 'channels'} bypass this protection.
        </p>
        <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-white/10 p-3 sm:grid-cols-2">
          {list.map((item) => (
            <label key={item.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={(e) =>
                  patch(
                    key,
                    e.target.checked
                      ? [...selected, item.value]
                      : selected.filter((id) => id !== item.value),
                  )
                }
              />
              {item.label}
            </label>
          ))}
          {!list.length && (
            <span className="text-sm text-ink-muted">
              {(kind === 'role' ? roles : channels).isLoading ? 'Loading…' : 'None available'}
            </span>
          )}
        </div>
      </fieldset>
    );
  };
  return (
    <GlassCard className="p-5 sm:p-6">
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={save.isPending}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{definition.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{definition.description}</p>
            </div>
            <Toggle
              checked={Boolean(draft.enabled)}
              onChange={(value) => patch('enabled', value)}
              aria-label={`Enable ${definition.title}`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid content-start gap-2 text-sm">
              <span>When triggered</span>
              <Select
                value={text('action')}
                onChange={(value) => patch('action', value)}
                options={definition.actions}
              />
            </label>
            {definition.fields.map((field) => (
              <label key={field.key} className="grid content-start gap-2 text-sm">
                <span>{field.label}</span>
                <Input
                  type="number"
                  required
                  step={1}
                  min={field.min}
                  max={field.max}
                  value={text(field.key)}
                  onChange={(e) => patch(field.key, e.target.value)}
                />
                {field.hint && <span className="text-ink-muted">{field.hint}</span>}
              </label>
            ))}
          </div>
          {module === 'joinRaid' && (
            <label className="mt-5 flex items-center gap-3 text-sm">
              <Toggle
                checked={Boolean(draft.autoLockdown)}
                onChange={(value) => patch('autoLockdown', value)}
                aria-label="Automatic lockdown on a join raid"
              />
              Automatically lock text channels when a raid is detected
            </label>
          )}
          {module !== 'antiSpam' && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>Alert channel</span>
                <Select
                  value={text('alertChannelId')}
                  onChange={(value) => patch('alertChannelId', value || null)}
                  options={options('channel', text('alertChannelId'))}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Role to mention in alerts</span>
                <Select
                  value={text('alertRoleId')}
                  onChange={(value) => patch('alertRoleId', value || null)}
                  options={options('role', text('alertRoleId'))}
                />
              </label>
            </div>
          )}
          {module === 'antiNuke' && (
            <label className="mt-5 grid gap-2 text-sm">
              <span>Exempt user IDs</span>
              <Textarea
                value={users}
                onChange={(e) => {
                  setUsers(e.target.value);
                  setDirty(true);
                }}
                placeholder="One Discord user ID per line"
              />
              <span className="text-ink-muted">
                These users bypass anti-nuke protection. Separate IDs with commas or new lines.
              </span>
            </label>
          )}
          {module !== 'joinRaid' && exclusions('whitelistedRoles', 'role', 'Exempt roles')}
          {module === 'antiSpam' && exclusions('whitelistedChannels', 'channel', 'Exempt channels')}
          {(channels.isError || roles.isError) && (
            <p role="alert" className="mt-4 text-sm text-amber-300">
              Some channels or roles could not load. Existing selections are preserved.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  void channels.refetch();
                  void roles.refetch();
                }}
              >
                Retry
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-sm text-ink-muted">
              {dirty ? 'Unsaved changes' : 'Settings saved'}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!dirty}
                onClick={() => {
                  setDirty(false);
                  setDraft(toDraft(config));
                  setError('');
                }}
              >
                Discard
              </Button>
              <Button type="submit" disabled={!dirty} loading={save.isPending}>
                <Save className="h-4 w-4" />
                Save {definition.title.toLowerCase()}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </GlassCard>
  );
}

function LockdownPanel({ guildId }: { guildId: string }) {
  const status = useAntiRaidStatus(guildId);
  const mutation = useAntiRaidLockdown(guildId);
  const [duration, setDuration] = useState('10');
  const [confirm, setConfirm] = useState<'lockdown' | 'unlock' | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const active = status.data?.lockdownActive;
  async function execute(event: FormEvent) {
    event.preventDefault();
    if (!confirm) return;
    const minutes = Number(duration);
    if (confirm === 'lockdown' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) {
      setError('Choose a duration between 1 and 1440 minutes.');
      return;
    }
    try {
      const response = await mutation.mutateAsync({ action: confirm, duration: minutes });
      setResult(
        `${response.locked ?? response.unlocked ?? 0} channels ${confirm === 'lockdown' ? 'locked' : 'unlocked'}; ${response.failed} failed.`,
      );
      setConfirm(null);
      setError('');
    } catch (err) {
      setError(extractApiError(err).message);
    }
  }
  return (
    <GlassCard className="mb-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Live protection status</h2>
          <p className="mt-1 text-sm text-ink-muted">Refreshes every 15 seconds.</p>
        </div>
        <Button variant="ghost" onClick={() => void status.refetch()} loading={status.isFetching}>
          <RefreshCw className="h-4 w-4" />
          Refresh status
        </Button>
      </div>
      {status.isError ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          Live status is unavailable. {extractApiError(status.error).message}
        </p>
      ) : !status.data ? (
        <Skeleton className="mt-4 h-16" />
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {(['joinRaid', 'antiNuke', 'antiSpam'] as ModuleKey[]).map((key) => (
            <Badge key={key} variant={status.data![key].enabled ? 'success' : 'default'}>
              {definitions[key].title}: {status.data![key].enabled ? 'On' : 'Off'}
            </Badge>
          ))}
          <Badge variant={status.data.joinRaid.raidModeActive ? 'danger' : 'default'}>
            {status.data.joinRaid.raidModeActive ? 'Raid mode active' : 'No active raid'}
          </Badge>
          <Badge variant={active ? 'danger' : 'default'}>
            {active ? 'Lockdown active' : 'No lockdown'}
          </Badge>
        </div>
      )}
      {active && status.data?.lockdownExpiresAt && (
        <p className="mt-3 text-sm text-ink-muted">
          Lockdown expires {new Date(status.data.lockdownExpiresAt).toLocaleString()}.
        </p>
      )}
      <form className="mt-5 border-t border-white/10 pt-5" onSubmit={(e) => void execute(e)}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm">
            <span>Lockdown duration (minutes)</span>
            <Input
              className="w-44"
              type="number"
              min={1}
              max={1440}
              required
              step={1}
              value={duration}
              disabled={mutation.isPending}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="danger"
            disabled={!status.data || status.isError || mutation.isPending}
            onClick={() => {
              setConfirm('lockdown');
              setError('');
            }}
          >
            <Lock className="h-4 w-4" />
            {active ? 'Extend lockdown' : 'Lock down server'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!active || status.isError || mutation.isPending}
            onClick={() => {
              setConfirm('unlock');
              setError('');
            }}
          >
            <Unlock className="h-4 w-4" />
            Unlock server
          </Button>
        </div>
        {confirm && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="text-sm">
              {confirm === 'lockdown'
                ? `Lock this server’s text channels for ${duration} minutes? This blocks @everyone from sending messages where role overrides do not grant access.`
                : 'Unlock this server? The bot clears @everyone send-message denials from all text channels, including channels locked before this raid.'}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="submit" variant="danger" loading={mutation.isPending}>
                Confirm {confirm === 'lockdown' ? 'lockdown' : 'unlock'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {result && (
          <p role="status" className="mt-4 text-sm">
            {result}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
    </GlassCard>
  );
}

export default function AntiRaid() {
  const { guildId = '' } = useParams();
  const config = useAntiRaid(guildId);
  return (
    <PageTransition>
      <PageHeader
        title="Anti-Raid"
        description="Manage the bot’s join raid, anti-nuke, and anti-spam protection."
        icon={ShieldCheck}
      />
      <LockdownPanel key={guildId} guildId={guildId} />
      {config.isError ? (
        <GlassCard className="p-6">
          <p role="alert" className="text-sm text-red-300">
            Could not load anti-raid settings. {extractApiError(config.error).message}
          </p>
          <Button className="mt-4" onClick={() => void config.refetch()}>
            Retry settings
          </Button>
        </GlassCard>
      ) : !config.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="grid gap-5">
          {(['joinRaid', 'antiNuke', 'antiSpam'] as ModuleKey[]).map((module) => (
            <ModuleForm
              key={`${guildId}:${module}`}
              guildId={guildId}
              module={module}
              config={config.data![module]}
            />
          ))}
        </div>
      )}
    </PageTransition>
  );
}
