import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Send, Shield, Tags } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import { useAutorole, usePostReactionRoles, useSetAutorole } from '@/hooks/useServer';
import { extractApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Server() {
  const { guildId = '' } = useParams();
  const roles = useGuildRoles(guildId);
  const channels = useGuildChannels(guildId);
  const autorole = useAutorole(guildId);
  const setAutorole = useSetAutorole(guildId);
  const postRR = usePostReactionRoles(guildId);
  const toast = useToast();

  const [autoRoleId, setAutoRoleId] = useState('');
  useEffect(() => {
    setAutoRoleId(autorole.data ?? '');
  }, [autorole.data]);

  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const roleOptions = useMemo(
    () => [{ value: '', label: 'None (disabled)' }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))],
    [roles.data],
  );
  const channelOptions = (channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }));

  const toggleRole = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]));

  const saveAutorole = async () => {
    try {
      await setAutorole.mutateAsync(autoRoleId || null);
      toast(autoRoleId ? 'Autorole saved' : 'Autorole disabled');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const postPanel = async () => {
    if (!channelId) return toast('Pick a channel first.', 'error');
    if (!selected.length) return toast('Pick at least one role.', 'error');
    try {
      await postRR.mutateAsync({ channelId, title, description, roleIds: selected });
      toast('Reaction-role panel posted!');
      setSelected([]);
      setTitle('');
      setDescription('');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader title="Server" description="Autorole and self-assign reaction roles." icon={Shield} />

      <div className="grid gap-4">
        {/* Autorole */}
        <GlassCard className="px-5">
          <Field label="Autorole" hint="Automatically give this role to every new member who joins.">
            <div className="flex items-center gap-2">
              <Select
                value={autoRoleId}
                onChange={setAutoRoleId}
                options={roleOptions}
                disabled={roles.isLoading}
                className="w-56"
              />
              <Button onClick={saveAutorole} loading={setAutorole.isPending}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </Field>
        </GlassCard>

        {/* Reaction roles */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-brand-300" />
            <h2 className="text-base font-semibold">Reaction roles</h2>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Post a panel of buttons that members click to give themselves roles (click again to remove).
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Channel</label>
              <Select
                value={channelId}
                onChange={setChannelId}
                options={channelOptions}
                placeholder={channels.isLoading ? 'Loading…' : 'Select a channel'}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Title (optional)</label>
              <Input value={title} maxLength={256} onChange={(e) => setTitle(e.target.value)} placeholder="🎭 Self-assign roles" />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Description (optional)</label>
            <Textarea
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Click a button below to toggle a role."
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-ink-muted">Roles ({selected.length}/5)</label>
            {roles.isLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (roles.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-faint">
                No assignable roles found — I can only offer roles below my own. Move my role higher in Server Settings → Roles.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(roles.data ?? []).map((r) => {
                  const on = selected.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-sm ring-1 ring-inset transition',
                        on
                          ? 'bg-brand-500/20 text-white ring-brand-500/40'
                          : 'bg-white/5 text-ink-muted ring-white/10 hover:text-ink',
                      )}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5">
            <Button onClick={postPanel} loading={postRR.isPending} disabled={!channelId || selected.length === 0}>
              <Send className="h-4 w-4" /> Post panel
            </Button>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
