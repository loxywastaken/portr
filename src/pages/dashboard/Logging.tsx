import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Save } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels } from '@/hooks/useGuild';
import { useLogging, useUpdateLogging } from '@/hooks/useLogging';
import { extractApiError } from '@/lib/api';
import type { LoggingSettings } from '@/types';

const CHANNEL_CONFIGS: { key: keyof LoggingSettings; label: string; hint: string }[] = [
  {
    key: 'modLogChannelId',
    label: 'Moderation log',
    hint: 'Bans, kicks, timeouts, warns and other mod actions.',
  },
  {
    key: 'messageLogChannelId',
    label: 'Message log',
    hint: 'Deleted and edited messages.',
  },
  {
    key: 'memberLogChannelId',
    label: 'Member log',
    hint: 'Role changes, nickname updates and profile changes.',
  },
  {
    key: 'joinLeaveChannelId',
    label: 'Join / leave log',
    hint: 'Members joining and leaving the server.',
  },
];

export default function Logging() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useLogging(guildId);
  const channels = useGuildChannels(guildId);
  const update = useUpdateLogging(guildId);
  const toast = useToast();

  const [form, setForm] = useState<LoggingSettings>({
    modLogChannelId: null,
    messageLogChannelId: null,
    memberLogChannelId: null,
    joinLeaveChannelId: null,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const channelOpts = [
    { value: '', label: '-- disabled --' },
    ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` })),
  ];

  async function save() {
    try {
      await update.mutateAsync(form);
      toast('Logging settings saved.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Logging"
        description="Choose where the bot sends log messages for different event types."
        icon={FileText}
        actions={
          <Button onClick={save} loading={update.isPending}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 max-w-2xl rounded-2xl" />
      ) : (
        <GlassCard className="max-w-2xl divide-y divide-white/10 px-5">
          {CHANNEL_CONFIGS.map((cfg) => (
            <Field key={cfg.key} label={cfg.label} hint={cfg.hint}>
              <Select
                value={form[cfg.key] ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, [cfg.key]: v || null }))}
                options={channelOpts}
                placeholder={channels.isLoading ? 'Loading...' : 'Select a channel'}
                className="w-56"
              />
            </Field>
          ))}
        </GlassCard>
      )}
    </PageTransition>
  );
}
