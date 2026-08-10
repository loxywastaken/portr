import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels } from '@/hooks/useGuild';
import { useAutomod, useUpdateAutomod, type AutoModAction, type AutoModRule, type AutoModSettings } from '@/hooks/useAutomod';
import { extractApiError } from '@/lib/api';

type RuleKey = 'profanity' | 'links' | 'caps' | 'spam' | 'mentions';

const ACTIONS = [
  { value: 'delete', label: 'Delete message' },
  { value: 'warn', label: 'Delete + warn' },
  { value: 'timeout', label: 'Delete + timeout' },
];

function num(e: ChangeEvent<HTMLInputElement>, fallback: number): number {
  const n = Number(e.target.value);
  return Number.isFinite(n) ? n : fallback;
}

/** One rule: header + toggle, and (when on) an action picker plus extra controls. */
function RuleShell({
  title,
  desc,
  rule,
  onToggle,
  onAction,
  needsContent,
  contentIntent,
  children,
}: {
  title: string;
  desc: string;
  rule: AutoModRule;
  onToggle: (v: boolean) => void;
  onAction: (a: AutoModAction) => void;
  needsContent?: boolean;
  contentIntent?: boolean;
  children?: ReactNode;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{title}</span>
            {needsContent && !contentIntent && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
                needs Message Content
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">{desc}</p>
        </div>
        <Toggle checked={rule.enabled} onChange={onToggle} aria-label={title} />
      </div>
      {rule.enabled && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-white/10 pt-3">
          <Field label="When triggered">
            <Select value={rule.action} onChange={(a) => onAction(a as AutoModAction)} options={ACTIONS} className="w-44" />
          </Field>
          {children}
        </div>
      )}
    </GlassCard>
  );
}

export default function Automod() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useAutomod(guildId);
  const channels = useGuildChannels(guildId);
  const update = useUpdateAutomod(guildId);
  const toast = useToast();

  const [form, setForm] = useState<AutoModSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  const header = (
    <PageHeader
      title="Auto Moderation"
      description="Automatically remove rule-breaking messages. Staff (Manage Messages) are always exempt."
      icon={ShieldCheck}
      actions={
        <Button onClick={() => void save()} loading={update.isPending} disabled={!form}>
          <Save className="h-4 w-4" /> Save changes
        </Button>
      }
    />
  );

  if (isLoading || !form) {
    return (
      <PageTransition>
        {header}
        <Skeleton className="h-96 rounded-2xl" />
      </PageTransition>
    );
  }

  const contentIntent = data?.contentIntent ?? false;
  const patch = (p: Partial<AutoModSettings>) => setForm((f) => (f ? { ...f, ...p } : f));
  const patchRule = (key: RuleKey, p: Record<string, unknown>) =>
    setForm((f) => (f ? ({ ...f, [key]: { ...(f[key] as Record<string, unknown>), ...p } } as AutoModSettings) : f));

  async function save() {
    if (!form) return;
    try {
      await update.mutateAsync(form);
      toast('Auto moderation saved 🛡️');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  }

  const channelOpts = [
    { value: '', label: '— no log channel —' },
    ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })),
  ];

  return (
    <PageTransition>
      {header}

      <div className="grid gap-4">
        {!contentIntent && (
          <GlassCard className="flex items-start gap-3 border-amber-400/20 bg-amber-400/[0.05] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="text-sm text-ink-muted">
              <p className="font-medium text-amber-200">The word/link/caps rules are asleep until Message Content is enabled.</p>
              <p className="mt-1">
                Those rules need to read message text, which requires the privileged <span className="text-ink">Message Content Intent</span>. Enable it in the{' '}
                <a className="text-ink underline decoration-white/30 hover:decoration-white" href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                  Discord Developer Portal
                </a>{' '}
                (your app → Bot → Privileged Gateway Intents), then ask to have it switched on server-side. <span className="text-ink">Spam</span> and <span className="text-ink">mass-mention</span> protection work right now without it.
              </p>
            </div>
          </GlassCard>
        )}

        <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Enable auto moderation</h2>
              <Badge variant={form.enabled ? 'success' : 'default'}>{form.enabled ? 'On' : 'Off'}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">Master switch — when off, no rules run regardless of their toggles.</p>
          </div>
          <Toggle checked={form.enabled} onChange={(v) => patch({ enabled: v })} aria-label="Enable auto moderation" />
        </GlassCard>

        <GlassCard className="flex flex-wrap items-end gap-4 p-5">
          <Field label="Log channel" hint="Where automod actions are logged (optional).">
            <Select value={form.logChannelId ?? ''} onChange={(v) => patch({ logChannelId: v || null })} options={channelOpts} className="w-56" />
          </Field>
          <Field label="Timeout length (minutes)" hint="Used by the “timeout” action.">
            <Input
              type="number"
              min={1}
              max={10080}
              value={form.timeoutMinutes}
              onChange={(e) => patch({ timeoutMinutes: num(e, 10) })}
              className="w-28"
            />
          </Field>
        </GlassCard>

        <RuleShell
          title="Profanity & slurs"
          desc="Removes slurs, strong profanity and scam/bait phrases (evasion-resistant filter)."
          rule={form.profanity}
          needsContent
          contentIntent={contentIntent}
          onToggle={(v) => patchRule('profanity', { enabled: v })}
          onAction={(a) => patchRule('profanity', { action: a })}
        />

        <RuleShell
          title="Links & invites"
          desc="Removes URLs and Discord server invites."
          rule={form.links}
          needsContent
          contentIntent={contentIntent}
          onToggle={(v) => patchRule('links', { enabled: v })}
          onAction={(a) => patchRule('links', { action: a })}
        />

        <RuleShell
          title="Excessive caps"
          desc="Removes shouting — messages that are mostly uppercase."
          rule={form.caps}
          needsContent
          contentIntent={contentIntent}
          onToggle={(v) => patchRule('caps', { enabled: v })}
          onAction={(a) => patchRule('caps', { action: a })}
        >
          <Field label="Caps threshold (%)">
            <Input type="number" min={50} max={100} value={form.caps.percent} onChange={(e) => patchRule('caps', { percent: num(e, 70) })} className="w-24" />
          </Field>
        </RuleShell>

        <RuleShell
          title="Spam (fast messages)"
          desc="Catches members sending messages too quickly. Works without Message Content."
          rule={form.spam}
          onToggle={(v) => patchRule('spam', { enabled: v })}
          onAction={(a) => patchRule('spam', { action: a })}
        >
          <Field label="Messages">
            <Input type="number" min={3} max={20} value={form.spam.messages} onChange={(e) => patchRule('spam', { messages: num(e, 5) })} className="w-20" />
          </Field>
          <Field label="Per (seconds)">
            <Input type="number" min={2} max={60} value={form.spam.seconds} onChange={(e) => patchRule('spam', { seconds: num(e, 5) })} className="w-24" />
          </Field>
        </RuleShell>

        <RuleShell
          title="Mass mentions"
          desc="Catches messages that ping too many people (or @everyone). Works without Message Content."
          rule={form.mentions}
          onToggle={(v) => patchRule('mentions', { enabled: v })}
          onAction={(a) => patchRule('mentions', { action: a })}
        >
          <Field label="Max mentions">
            <Input type="number" min={3} max={20} value={form.mentions.max} onChange={(e) => patchRule('mentions', { max: num(e, 5) })} className="w-24" />
          </Field>
        </RuleShell>
      </div>
    </PageTransition>
  );
}
