import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ClipboardList, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import {
  useApplications,
  useDeleteApplication,
  useSaveApplication,
  useSendApplicationPanel,
  type Application,
  type ApplicationInput,
} from '@/hooks/useApplications';
import { extractApiError } from '@/lib/api';

const BLANK: ApplicationInput = {
  name: '',
  description: '',
  questions: [{ label: '', style: 'paragraph', required: true, maxLength: 1000 }],
  reviewChannelId: null,
  acceptRoleId: null,
  acceptRoleIds: [],
  reviewerRoleId: null,
  pingRoleId: null,
  enabled: true,
};

export default function Applications() {
  const { guildId = '' } = useParams();
  const apps = useApplications(guildId);
  const channels = useGuildChannels(guildId);
  const roles = useGuildRoles(guildId);
  const save = useSaveApplication(guildId);
  const del = useDeleteApplication(guildId);
  const sendPanel = useSendApplicationPanel(guildId);
  const toast = useToast();

  const [editing, setEditing] = useState<{ id?: string; draft: ApplicationInput } | null>(null);
  const [panelChannel, setPanelChannel] = useState('');

  const channelOpts = [{ value: '', label: '— select a channel —' }, ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))];
  const roleOpts = [{ value: '', label: 'None' }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))];

  const startNew = () => setEditing({ draft: JSON.parse(JSON.stringify(BLANK)) });
  const startEdit = (a: Application) =>
    setEditing({
      id: a.id,
      draft: {
        name: a.name,
        description: a.description,
        questions: a.questions.length ? a.questions.map((q) => ({ ...q })) : JSON.parse(JSON.stringify(BLANK.questions)),
        reviewChannelId: a.reviewChannelId,
        acceptRoleId: a.acceptRoleId,
        acceptRoleIds: [...(a.acceptRoleIds?.length ? a.acceptRoleIds : a.acceptRoleId ? [a.acceptRoleId] : [])],
        reviewerRoleId: a.reviewerRoleId,
        pingRoleId: a.pingRoleId,
        enabled: a.enabled,
      },
    });

  const patch = (p: Partial<ApplicationInput>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e));
  const patchQuestion = (i: number, p: Partial<ApplicationInput['questions'][number]>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, questions: e.draft.questions.map((q, idx) => (idx === i ? { ...q, ...p } : q)) } } : e));
  const addQuestion = () =>
    setEditing((e) =>
      !e || e.draft.questions.length >= 25 ? e : { ...e, draft: { ...e.draft, questions: [...e.draft.questions, { label: '', style: 'paragraph', required: true, maxLength: 1000 }] } },
    );
  const addAcceptRole = (id: string) => {
    if (!id) return;
    setEditing((e) => {
      if (!e || e.draft.acceptRoleIds.includes(id) || e.draft.acceptRoleIds.length >= 25) return e;
      const acceptRoleIds = [...e.draft.acceptRoleIds, id];
      return { ...e, draft: { ...e.draft, acceptRoleIds, acceptRoleId: acceptRoleIds[0] } };
    });
  };
  const removeAcceptRole = (id: string) =>
    setEditing((e) => {
      if (!e) return e;
      const acceptRoleIds = e.draft.acceptRoleIds.filter((roleId) => roleId !== id);
      return { ...e, draft: { ...e.draft, acceptRoleIds, acceptRoleId: acceptRoleIds[0] ?? null } };
    });
  const removeQuestion = (i: number) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, questions: e.draft.questions.filter((_, idx) => idx !== i) } } : e));

  const onSave = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim()) return toast('Give the application a name.', 'error');
    if (!d.reviewChannelId) return toast('Pick a channel where submissions are reviewed.', 'error');
    const questions = d.questions.filter((q) => q.label.trim());
    if (!questions.length) return toast('Add at least one question.', 'error');
    if (questions.length !== d.questions.length) return toast('Fill in or remove empty questions before saving.', 'error');
    try {
      await save.mutateAsync({ id: editing.id, data: { ...d, questions } });
      toast('Application saved.');
      setEditing(null);
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast('Application deleted.');
      setEditing(null);
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onSendPanel = async () => {
    if (!panelChannel) return toast('Pick a channel for the panel.', 'error');
    try {
      await sendPanel.mutateAsync({ channelId: panelChannel });
      toast('Apply panel posted.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  /* ------------------------------------------------------------- editor -- */
  if (editing) {
    const d = editing.draft;
    return (
      <PageTransition>
        <PageHeader
          title={editing.id ? 'Edit application' : 'New application'}
          description="Applicants fill this in with /apply."
          icon={ClipboardList}
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={onSave} loading={save.isPending}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          }
        />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <GlassCard className="p-5 lg:col-start-2 lg:row-start-1">
            <h2 className="mb-4 text-base font-semibold">Application settings</h2>
            <Field stacked label="Name" hint="Shown to applicants (e.g. “Staff Application”).">
              <Input value={d.name} maxLength={90} onChange={(e) => patch({ name: e.target.value })} placeholder="Staff Application" />
            </Field>
            <div className="border-t border-white/10 py-4">
              <div className="text-sm font-medium">Description</div>
              <Textarea value={d.description} maxLength={500} onChange={(e) => patch({ description: e.target.value })} className="mt-2" placeholder="A short blurb about the role…" />
            </div>
            <Field stacked label="Review channel" hint="Where submissions post for staff to Accept/Deny.">
              <Select value={d.reviewChannelId ?? ''} onChange={(v) => patch({ reviewChannelId: v || null })} options={channelOpts} />
            </Field>
            <Field stacked label="Accept roles" hint="All selected roles are given to an accepted applicant. The bot must be above them in the role list.">
              <Select
                value=""
                onChange={addAcceptRole}
                options={[{ value: '', label: d.acceptRoleIds.length >= 25 ? 'Maximum of 25 roles' : 'Add a role…' }, ...roleOpts.filter((r) => r.value && !d.acceptRoleIds.includes(r.value))]}
                disabled={d.acceptRoleIds.length >= 25}
              />
              {d.acceptRoleIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.acceptRoleIds.map((id) => (
                    <span key={id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-brand-400/25 bg-brand-500/10 px-2.5 py-1.5 text-xs text-brand-100">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{roles.data?.find((r) => r.id === id)?.name ?? id}</span>
                      <button type="button" onClick={() => removeAcceptRole(id)} aria-label={`Remove ${roles.data?.find((r) => r.id === id)?.name ?? id}`} className="rounded p-0.5 hover:bg-white/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field stacked label="Reviewer role" hint="This role (plus Manage Server) can Accept/Deny (optional).">
              <Select value={d.reviewerRoleId ?? ''} onChange={(v) => patch({ reviewerRoleId: v || null })} options={roleOpts} />
            </Field>
            <Field stacked label="Ping role" hint="Pinged when a new application arrives (optional).">
              <Select value={d.pingRoleId ?? ''} onChange={(v) => patch({ pingRoleId: v || null })} options={roleOpts} />
            </Field>
            <Field stacked label="Open for applications" hint="Turn off to close this application.">
              <Toggle checked={d.enabled} onChange={(v) => patch({ enabled: v })} />
            </Field>
          </GlassCard>

          <GlassCard className="p-5 lg:col-start-1 lg:row-start-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Questions</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Up to 25 questions. Applicants answer five at a time in Discord.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={addQuestion} disabled={d.questions.length >= 25}>
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="rounded-lg bg-brand-500/15 px-2.5 py-1 font-medium text-brand-200">{d.questions.length} / 25 questions</span>
              <span>{Math.ceil(d.questions.length / 5)} {Math.ceil(d.questions.length / 5) === 1 ? 'page' : 'pages'} in Discord</span>
            </div>

            <div className="mt-4 space-y-3">
              {d.questions.map((q, i) => (
                <div key={i}>
                  {i % 5 === 0 && (
                    <div className="mb-2 flex items-center gap-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      <span>Page {Math.floor(i / 5) + 1}</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <div className="rounded-xl border border-white/10 bg-surface-raised/70 p-3.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.07] text-xs font-semibold text-ink-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Input value={q.label} maxLength={45} onChange={(e) => patchQuestion(i, { label: e.target.value })} placeholder={`Question ${i + 1} (e.g. Why do you want to join staff?)`} />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Select
                          value={q.style}
                          onChange={(v) => patchQuestion(i, { style: v === 'paragraph' ? 'paragraph' : 'short' })}
                          options={[
                            { value: 'short', label: 'Short answer' },
                            { value: 'paragraph', label: 'Paragraph' },
                          ]}
                          className="w-40"
                        />
                        <label className="flex items-center gap-2 text-xs text-ink-muted">
                          Required
                          <Toggle checked={q.required} onChange={(v) => patchQuestion(i, { required: v })} />
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  </div>
                </div>
              ))}
              {d.questions.length === 0 && <p className="text-sm text-ink-faint">No questions yet — add at least one.</p>}
            </div>
          </GlassCard>

          {editing.id && (
            <GlassCard className="flex items-center justify-between gap-3 p-5 lg:col-start-2">
              <div className="text-sm text-ink-muted">Delete this application permanently.</div>
              <Button variant="danger" onClick={() => onDelete(editing.id!)} loading={del.isPending}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </GlassCard>
          )}
        </div>
      </PageTransition>
    );
  }

  /* --------------------------------------------------------------- list -- */
  const channelName = (id: string | null) => (id ? channels.data?.find((c) => c.id === id)?.name : null);

  return (
    <PageTransition>
      <PageHeader
        title="Applications"
        description="Build application forms members fill in with /apply."
        icon={ClipboardList}
        actions={
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> New application
          </Button>
        }
      />

      {apps.data && apps.data.length > 0 && (
        <GlassCard className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Post an apply panel</h2>
            <p className="text-xs text-ink-faint">
              Members click a button to apply — no need to type <code className="rounded bg-white/10 px-1 py-0.5">/apply</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={panelChannel} onChange={setPanelChannel} options={channelOpts} className="w-56" />
            <Button variant="secondary" onClick={onSendPanel} loading={sendPanel.isPending}>
              <Send className="h-4 w-4" /> Send panel
            </Button>
          </div>
        </GlassCard>
      )}

      {apps.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : apps.data && apps.data.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
          <ClipboardList className="h-8 w-8 text-ink-faint" />
          <p className="text-ink-muted">No applications yet. Create one and members can apply with <code className="rounded bg-white/10 px-1.5 py-0.5">/apply</code>.</p>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> New application
          </Button>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {apps.data?.map((a) => (
            <GlassCard key={a.id} className="flex flex-col p-5 transition-colors hover:border-white/20">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{a.name}</span>
                    {a.enabled ? <Badge variant="success">Open</Badge> : <Badge variant="danger">Closed</Badge>}
                  </div>
                  {a.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{a.description}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
                <span>{a.questions.length} question{a.questions.length === 1 ? '' : 's'}</span>
                <span>{a.acceptRoleIds?.length ?? (a.acceptRoleId ? 1 : 0)} accept roles</span>
                <span>Review: {channelName(a.reviewChannelId) ? `#${channelName(a.reviewChannelId)}` : 'not set'}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(a)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(a.id)} loading={del.isPending}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
