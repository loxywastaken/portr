import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, UserPlus } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { ColorInput } from '@/components/ui/ColorInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { DiscordEmbedPreview } from '@/components/common/DiscordEmbedPreview';
import { useUpdateWelcome, useWelcome } from '@/hooks/useWelcome';
import { useGuildChannels, useGuildOverview } from '@/hooks/useGuild';
import { extractApiError } from '@/lib/api';
import type { WelcomeSettings } from '@/types';

const VARIABLES = ['{user}', '{user.name}', '{server}', '{memberCount}'];

export default function Welcome() {
  const { guildId = '' } = useParams();
  const welcome = useWelcome(guildId);
  const channels = useGuildChannels(guildId);
  const overview = useGuildOverview(guildId);
  const update = useUpdateWelcome(guildId);
  const toast = useToast();

  const [form, setForm] = useState<WelcomeSettings | null>(null);
  useEffect(() => {
    if (welcome.data) setForm(welcome.data);
  }, [welcome.data]);

  const set = <K extends keyof WelcomeSettings>(key: K, value: WelcomeSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!form) return;
    try {
      await update.mutateAsync(form);
      toast('Welcome settings saved');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  if (!form) {
    return (
      <PageTransition>
        <PageHeader title="Welcome" description="Greet new members automatically." icon={UserPlus} />
        <Skeleton className="h-96 rounded-2xl" />
      </PageTransition>
    );
  }

  const channelOptions = (channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }));

  return (
    <PageTransition>
      <PageHeader
        title="Welcome"
        description="Greet new members automatically."
        icon={UserPlus}
        actions={
          <>
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              Enabled
              <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
            </span>
            <Button onClick={save} loading={update.isPending}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="divide-y divide-white/10 px-5">
          <Field label="Channel" hint="Where welcome messages are posted.">
            <Select
              value={form.channelId}
              onChange={(v) => set('channelId', v)}
              options={channelOptions}
              placeholder={channels.isLoading ? 'Loading…' : 'Select a channel'}
              className="w-56"
            />
          </Field>
          <Field label="Mention new member" hint="Ping the member in the message.">
            <Toggle checked={form.mentionUser} onChange={(v) => set('mentionUser', v)} />
          </Field>
          <Field label="Use embed" hint="Send a rich embed instead of plain text.">
            <Toggle checked={form.useEmbed} onChange={(v) => set('useEmbed', v)} />
          </Field>

          {form.useEmbed && (
            <>
              <Field label="Embed title">
                <Input
                  value={form.title}
                  maxLength={256}
                  onChange={(e) => set('title', e.target.value)}
                  className="w-56"
                />
              </Field>
              <Field label="Embed colour">
                <ColorInput value={form.embedColor} onChange={(v) => set('embedColor', v)} />
              </Field>
              <Field label="Image URL" hint="Optional banner image.">
                <Input
                  value={form.imageUrl ?? ''}
                  onChange={(e) => set('imageUrl', e.target.value || null)}
                  placeholder="https://…"
                  className="w-56"
                />
              </Field>
            </>
          )}

          <div className="py-4">
            <div className="text-sm font-medium">Message</div>
            <Textarea
              value={form.message}
              maxLength={2000}
              onChange={(e) => set('message', e.target.value)}
              className="mt-2"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('message', `${form.message}${form.message ? ' ' : ''}${v}`)}
                  className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-ink-muted transition hover:bg-white/10 hover:text-ink"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        <div>
          <div className="mb-2 text-sm text-ink-muted">Live preview</div>
          <DiscordEmbedPreview
            guildName={overview.data?.name ?? 'Your Server'}
            title={form.title}
            message={form.message}
            useEmbed={form.useEmbed}
            embedColor={form.embedColor}
            imageUrl={form.imageUrl}
            mentionUser={form.mentionUser}
          />
          {!form.enabled && (
            <p className="mt-3 text-xs text-amber-300/80">
              Welcome messages are disabled — toggle “Enabled” above to activate them.
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
