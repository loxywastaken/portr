import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { ColorInput } from '@/components/ui/ColorInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { extractApiError } from '@/lib/api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
];

export default function Settings() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useSettings(guildId);
  const update = useUpdateSettings(guildId);
  const toast = useToast();

  const [prefix, setPrefix] = useState('!');
  const [language, setLanguage] = useState('en');
  const [embedColor, setEmbedColor] = useState('#5865F2');

  useEffect(() => {
    if (data) {
      setPrefix(data.prefix);
      setLanguage(data.language);
      setEmbedColor(data.embedColor);
    }
  }, [data]);

  const save = async () => {
    try {
      await update.mutateAsync({ prefix, language, embedColor });
      toast('Settings saved');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="General configuration for this server."
        icon={SettingsIcon}
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
          <Field label="Command prefix" hint="Prefix for legacy text commands.">
            <Input
              value={prefix}
              maxLength={5}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-24 text-center font-mono"
            />
          </Field>
          <Field label="Language" hint="Language for bot responses.">
            <Select value={language} onChange={setLanguage} options={LANGUAGES} className="w-48" />
          </Field>
          <Field label="Embed colour" hint="Accent colour used across bot embeds.">
            <ColorInput value={embedColor} onChange={setEmbedColor} />
          </Field>
        </GlassCard>
      )}
    </PageTransition>
  );
}
