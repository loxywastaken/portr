import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { ColorInput } from '@/components/ui/ColorInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { ChannelPicker } from '@/components/common/Pickers';
import { useDeleteRoleMenu, useRoleMenus, useSaveRoleMenu, type RoleMenu, type RoleMenuInput } from '@/hooks/useFeatures';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import { extractApiError } from '@/lib/api';

const blank = (): RoleMenuInput => ({
  channelId: '',
  title: 'Pick your roles',
  description: '',
  color: '#5865F2',
  mode: 'multi',
  options: [],
});

function Editor({
  guildId,
  initial,
  maxRoles,
  onDone,
}: {
  guildId: string;
  initial: RoleMenuInput & { id?: string };
  maxRoles: number;
  onDone: () => void;
}) {
  const [menu, setMenu] = useState(initial);
  const { data: roles = [] } = useGuildRoles(guildId);
  const save = useSaveRoleMenu(guildId);
  const toast = useToast();
  const set = (patch: Partial<RoleMenuInput>) => setMenu((m) => ({ ...m, ...patch }));

  const submit = async () => {
    if (!menu.channelId) return toast('Pick a channel to post in.', 'error');
    if (!menu.options.length) return toast('Add at least one role.', 'error');
    try {
      await save.mutateAsync(menu);
      toast(initial.id ? 'Role menu updated' : 'Role menu posted');
      onDone();
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{initial.id ? 'Edit role menu' : 'New role menu'}</h2>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="divide-y">
        <Field label="Channel" hint="Where the menu is posted.">
          <ChannelPicker guildId={guildId} value={menu.channelId || null} onChange={(v) => set({ channelId: v ?? '' })} placeholder="Pick a channel" />
        </Field>
        <Field label="Title">
          <Input value={menu.title} maxLength={256} onChange={(e) => set({ title: e.target.value })} className="w-full sm:w-72" />
        </Field>
        <Field label="Description" hint="Optional. A default line is used when empty." stacked>
          <Textarea value={menu.description} maxLength={2000} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Colour">
          <ColorInput value={menu.color} onChange={(v) => set({ color: v })} />
        </Field>
        <Field label="Mode" hint="Single choice swaps roles, e.g. for colours or regions.">
          <Select
            value={menu.mode}
            onChange={(v) => set({ mode: v as RoleMenuInput['mode'] })}
            options={[
              { value: 'multi', label: 'Pick any' },
              { value: 'single', label: 'Pick one' },
            ]}
            className="w-40"
          />
        </Field>
        <Field label={`Roles (${menu.options.length}/${maxRoles})`} hint="Button label and optional emoji for each role." stacked>
          <div className="space-y-2">
            {menu.options.map((o, i) => (
              <div key={o.roleId} className="flex flex-wrap items-center gap-2">
                <span className="w-full truncate text-sm text-ink-muted sm:w-40">@ {roles.find((r) => r.id === o.roleId)?.name ?? 'deleted'}</span>
                <Input
                  value={o.emoji ?? ''}
                  placeholder="🙂"
                  maxLength={64}
                  aria-label="Emoji"
                  className="w-16 text-center"
                  onChange={(e) => set({ options: menu.options.map((x, j) => (j === i ? { ...x, emoji: e.target.value || null } : x)) })}
                />
                <Input
                  value={o.label}
                  maxLength={80}
                  aria-label="Button label"
                  className="min-w-0 flex-1"
                  onChange={(e) => set({ options: menu.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                />
                <Button variant="ghost" size="icon" aria-label="Remove role" onClick={() => set({ options: menu.options.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {menu.options.length < maxRoles && (
              <Select
                value=""
                onChange={(id) => {
                  const role = roles.find((r) => r.id === id);
                  if (role) set({ options: [...menu.options, { roleId: role.id, label: role.name.slice(0, 80), emoji: null }] });
                }}
                className="w-full sm:w-60"
                options={[
                  { value: '', label: 'Add a role…' },
                  ...roles.filter((r) => !menu.options.some((o) => o.roleId === r.id)).map((r) => ({ value: r.id, label: `@ ${r.name}` })),
                ]}
              />
            )}
            {menu.options.length >= maxRoles && maxRoles < 25 && (
              <p className="text-xs text-ink-faint">Free servers get {maxRoles} roles per menu. Premium allows 25.</p>
            )}
          </div>
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} loading={save.isPending}>
          {initial.id ? 'Save & update message' : 'Post menu'}
        </Button>
      </div>
    </GlassCard>
  );
}

export default function RoleMenus() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = useRoleMenus(guildId);
  const { data: channels = [] } = useGuildChannels(guildId);
  const remove = useDeleteRoleMenu(guildId);
  const toast = useToast();
  const [editing, setEditing] = useState<(RoleMenuInput & { id?: string }) | null>(null);

  const full = data ? data.menus.length >= data.maxMenus : false;
  const startEdit = (m: RoleMenu) => {
    const { messageId: _messageId, ...rest } = m;
    setEditing(rest);
  };

  return (
    <PageTransition>
      <PageHeader
        title="Role menus"
        description="Button messages that let members pick their own roles."
        icon={Tags}
        actions={
          !editing && (
            <Button onClick={() => setEditing(blank())} disabled={full}>
              <Plus className="h-4 w-4" /> New menu
            </Button>
          )
        }
      />

      {editing && data && (
        <div className="mb-8">
          <Editor guildId={guildId} initial={editing} maxRoles={data.maxRoles} onDone={() => setEditing(null)} />
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <>
          <div className="mb-3 text-sm text-ink-muted">
            {data.menus.length} of {data.maxMenus} menus{!data.premium && ' · Premium allows 25 menus with 25 roles each'}
          </div>
          {data.menus.length === 0 ? (
            <GlassCard className="p-10 text-center text-sm text-ink-muted">No role menus yet. Create one to get started.</GlassCard>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.menus.map((m) => (
                <GlassCard key={m.id} className="flex items-start gap-4 p-5">
                  <span className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ background: m.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.title}</div>
                    <div className="mt-0.5 text-xs text-ink-faint">
                      # {channels.find((c) => c.id === m.channelId)?.name ?? 'deleted channel'} · {m.options.length} roles ·{' '}
                      {m.mode === 'single' ? 'pick one' : 'pick any'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.options.slice(0, 8).map((o) => (
                        <span key={o.roleId} className="rounded border px-1.5 py-0.5 text-xs text-ink-muted">
                          {o.emoji} {o.label}
                        </span>
                      ))}
                      {m.options.length > 8 && <span className="text-xs text-ink-faint">+{m.options.length - 8}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit menu" onClick={() => startEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete menu"
                      onClick={async () => {
                        if (!window.confirm(`Delete “${m.title}” and its message?`)) return;
                        try {
                          await remove.mutateAsync(m.id);
                          toast('Role menu deleted');
                        } catch (err) {
                          toast(extractApiError(err).message, 'error');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
