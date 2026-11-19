import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { ColorInput } from '@/components/ui/ColorInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { ChannelPicker, RolePicker } from '@/components/common/Pickers';
import { PremiumGate, PremiumTag } from '@/components/common/PremiumGate';
import { useConfig, useUpdateConfig, type ConfigPatch, type ServerConfig } from '@/hooks/useFeatures';
import { extractApiError } from '@/lib/api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
];

type Draft = Omit<ServerConfig, 'premium'>;

function Section({ title, description, tag, children }: { title: string; description: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-8 first:pt-0 last:border-0 lg:grid-cols-[16rem_1fr] lg:gap-10">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {title} {tag}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <GlassCard className="divide-y px-5">{children}</GlassCard>
    </section>
  );
}

/** Only the fields that changed, grouped by section — so saving never overwrites other tabs. */
function diff(base: Draft, draft: Draft): ConfigPatch {
  const out: Record<string, Record<string, unknown>> = {};
  for (const section of Object.keys(draft) as (keyof Draft)[]) {
    for (const [k, v] of Object.entries(draft[section])) {
      if ((base[section] as Record<string, unknown>)[k] !== v) (out[section] ??= {})[k] = v;
    }
  }
  return out as ConfigPatch;
}

export default function Settings() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useConfig(guildId);
  const update = useUpdateConfig(guildId);
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (data) {
      const { premium: _premium, ...rest } = data;
      setDraft(rest);
    }
  }, [data]);

  const changes = useMemo(() => (data && draft ? diff(data, draft) : {}), [data, draft]);
  const dirty = Object.keys(changes).length > 0;

  const set = <S extends keyof Draft>(section: S, patch: Partial<Draft[S]>) =>
    setDraft((d) => (d ? { ...d, [section]: { ...d[section], ...patch } } : d));

  const save = async () => {
    try {
      await update.mutateAsync(changes);
      toast('Settings saved');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="Everything that applies to the whole server."
        icon={SettingsIcon}
        actions={
          <Button onClick={save} loading={update.isPending} disabled={!dirty}>
            <Save className="h-4 w-4" /> {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      {isLoading || !draft || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div>
          <Section title="General" description="Basics for how the bot works here.">
            <Field label="Command prefix" hint="For legacy text commands.">
              <Input
                value={draft.general.prefix}
                maxLength={5}
                onChange={(e) => set('general', { prefix: e.target.value })}
                className="w-24 text-center font-mono"
              />
            </Field>
            <Field label="Language" hint="Language for bot responses.">
              <Select value={draft.general.language} onChange={(v) => set('general', { language: v })} options={LANGUAGES} className="w-48" />
            </Field>
            <Field label="Embed colour" hint="Accent colour on the bot's messages.">
              <ColorInput value={draft.general.embedColor} onChange={(v) => set('general', { embedColor: v })} />
            </Field>
            <Field label="Autorole" hint="Given to every new member.">
              <RolePicker guildId={guildId} value={draft.general.autoRoleId} onChange={(v) => set('general', { autoRoleId: v })} placeholder="Off" />
            </Field>
          </Section>

          <Section title="Moderation" description="How punishments are handled and recorded.">
            <Field label="Mod log channel" hint="Every ban, kick, timeout and warn is posted here.">
              <ChannelPicker guildId={guildId} value={draft.moderation.logChannelId} onChange={(v) => set('moderation', { logChannelId: v })} />
            </Field>
            <Field label="DM members when punished" hint="Tell them what happened and why.">
              <Toggle checked={draft.moderation.dmOnAction} onChange={(v) => set('moderation', { dmOnAction: v })} aria-label="DM members when punished" />
            </Field>
            <Field label="Mute role" hint="Optional role used for mutes.">
              <RolePicker guildId={guildId} value={draft.moderation.muteRoleId} onChange={(v) => set('moderation', { muteRoleId: v })} />
            </Field>
          </Section>

          <Section
            title="Server logs"
            description="Pick where the bot reports what happens in your server. Leave a channel off to skip that log."
          >
            <Field label="Message log" hint="Deleted and edited messages.">
              <ChannelPicker guildId={guildId} value={draft.logging.messageLogChannelId} onChange={(v) => set('logging', { messageLogChannelId: v })} />
            </Field>
            <Field label="Member log" hint="Role changes, nicknames, bans and unbans.">
              <ChannelPicker guildId={guildId} value={draft.logging.memberLogChannelId} onChange={(v) => set('logging', { memberLogChannelId: v })} />
            </Field>
            <Field label="Join & leave log" hint="Who joined or left, with account age.">
              <ChannelPicker guildId={guildId} value={draft.logging.joinLeaveChannelId} onChange={(v) => set('logging', { joinLeaveChannelId: v })} />
            </Field>
          </Section>

          <Section
            title="Bot branding"
            description="Make Nexus look like your own bot in this server."
            tag={<PremiumTag />}
          >
            <PremiumGate premium={data.premium} note="Custom branding needs Premium">
              <div className="divide-y">
                <Field label="Bot nickname" hint="Shown instead of “Nexus Service”. Permanent.">
                  <Input
                    value={draft.branding.nickname ?? ''}
                    maxLength={32}
                    placeholder="Nexus Service"
                    onChange={(e) => set('branding', { nickname: e.target.value || null })}
                    className="w-full sm:w-60"
                  />
                </Field>
                <Field label="Embed footer" hint="Shown under the bot's messages, logs and level-ups.">
                  <Input
                    value={draft.branding.footerText ?? ''}
                    maxLength={100}
                    placeholder="Powered by your server"
                    onChange={(e) => set('branding', { footerText: e.target.value || null })}
                    className="w-full sm:w-60"
                  />
                </Field>
              </div>
            </PremiumGate>
          </Section>
        </div>
      )}
    </PageTransition>
  );
}
