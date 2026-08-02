import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
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
  const toast = useToast();

  const [editing, setEditing] = useState<{ id?: string; draft: ApplicationInput } | null>(null);

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
      !e || e.draft.questions.length >= 5 ? e : { ...e, draft: { ...e.draft, questions: [...e.draft.questions, { label: '', style: 'paragraph', required: true, maxLength: 1000 }] } },
    );
  const removeQuestion = (i: number) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, questions: e.draft.questions.filter((_, idx) => idx !== i) } } : e));

  const onSave = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim()) return toast('Give the application a name.', 'error');
    if (!d.reviewChannelId) return toast('Pick a channel where submissions are reviewed.', 'error');
    const questions = d.questions.filter((q) => q.label.trim());
    if (!questions.length) return toast('Add at least one question.', 'error');
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

        <div className="grid gap-4">
          <GlassCard className="px-5">
            <Field label="Name" hint="Shown to applicants (e.g. “Staff Application”).">
              <Input value={d.name} maxLength={90} onChange={(e) => patch({ name: e.target.value })} className="w-64" placeholder="Staff Application" />
            </Field>
            <div className="border-t border-white/10 py-4">
              <div className="text-sm font-medium">Description</div>
              <Textarea value={d.description} maxLength={500} onChange={(e) => patch({ description: e.target.value })} className="mt-2" placeholder="A short blurb about the role…" />
            </div>
            <Field label="Review channel" hint="Where submissions post for staff to Accept/Deny.">
              <Select value={d.reviewChannelId ?? ''} onChange={(v) => patch({ reviewChannelId: v || null })} options={channelOpts} className="w-56" />
            </Field>
            <Field label="Accept role" hint="Given to the applicant when accepted (optional).">
              <Select value={d.acceptRoleId ?? ''} onChange={(v) => patch({ acceptRoleId: v || null })} options={roleOpts} className="w-56" />
            </Field>
            <Field label="Reviewer role" hint="This role (plus Manage Server) can Accept/Deny (optional).">
              <Select value={d.reviewerRoleId ?? ''} onChange={(v) => patch({ reviewerRoleId: v || null })} options={roleOpts} className="w-56" />
            </Field>
            <Field label="Ping role" hint="Pinged when a new application arrives (optional).">
              <Select value={d.pingRoleId ?? ''} onChange={(v) => patch({ pingRoleId: v || null })} options={roleOpts} className="w-56" />
            </Field>
            <Field label="Open for applications" hint="Turn off to close this application.">
              <Toggle checked={d.enabled} onChange={(v) => patch({ enabled: v })} />
            </Field>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Questions</h2>
                <p className="mt-0.5 text-xs text-ink-faint">Up to 5 (Discord’s modal limit). Each becomes a box in the /apply form.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={addQuestion} disabled={d.questions.length >= 5}>
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {d.questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-ink-faint" />
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
              ))}
              {d.questions.length === 0 && <p className="text-sm text-ink-faint">No questions yet — add at least one.</p>}
            </div>
          </GlassCard>

          {editing.id && (
            <GlassCard className="flex items-center justify-between p-5">
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
