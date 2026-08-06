import { useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { FileUp, LayoutTemplate, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useDeleteTemplate,
  useGenerateTemplate,
  useSaveTemplate,
  useSavedTemplates,
  useTemplateUsage,
  type BuildResult,
  type SavedTemplate,
} from '@/hooks/useTemplates';
import { extractApiError } from '@/lib/api';

export default function Templates() {
  const { guildId = '' } = useParams();
  const usage = useTemplateUsage(guildId);
  const saved = useSavedTemplates(guildId);
  const generate = useGenerateTemplate(guildId);
  const saveTpl = useSaveTemplate(guildId);
  const delTpl = useDeleteTemplate(guildId);
  const toast = useToast();

  const [text, setText] = useState('');
  const [saveName, setSaveName] = useState('');
  const [result, setResult] = useState<BuildResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const u = usage.data;
  const remaining = u?.remaining ?? 0;

  const loadSample = () => {
    if (u?.sample) setText(JSON.stringify(u.sample, null, 2));
  };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(f);
    e.target.value = '';
  };

  const onGenerate = async () => {
    if (!text.trim()) return toast('Paste or load a design first.', 'error');
    setResult(null);
    try {
      const res = await generate.mutateAsync(text);
      setResult(res.result);
      const w = res.result.warnings.length ? ` (${res.result.warnings.length} skipped)` : '';
      toast(`Built ${res.result.channels} channels, ${res.result.categories} categories, ${res.result.roles} roles${w}.`);
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onSave = async () => {
    if (!saveName.trim()) return toast('Name the template to save it.', 'error');
    if (!text.trim()) return toast('Nothing to save yet.', 'error');
    try {
      await saveTpl.mutateAsync({ name: saveName.trim(), design: text });
      setSaveName('');
      toast('Template saved.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const loadSaved = (t: SavedTemplate) => setText(typeof t.design === 'string' ? t.design : JSON.stringify(t.design, null, 2));
  const onDelete = async (id: string) => {
    try {
      await delTpl.mutateAsync(id);
      toast('Deleted.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Server Templates"
        description="Paste a JSON design and build the whole layout — categories, channels and roles — in one click."
        icon={LayoutTemplate}
      />

      {usage.isLoading ? (
        <Skeleton className="mb-4 h-16 rounded-2xl" />
      ) : (
        <GlassCard className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Badge variant={u?.isPremium ? 'success' : 'default'}>{u?.isPremium ? 'Premium' : 'Free'}</Badge>
            <div className="text-sm">
              <span className="font-semibold">{u?.used ?? 0}</span>
              <span className="text-ink-muted"> / {u?.limit ?? 0} used today</span>
              <span className="text-ink-faint"> · {remaining} left</span>
            </div>
          </div>
          {!u?.isPremium && (
            <p className="text-xs text-ink-faint">
              Free plan is {u?.limit ?? 2}/day. Premium unlocks <span className="text-ink-muted">{u?.premiumLimit ?? 10}/day</span> — run{' '}
              <code className="rounded bg-white/10 px-1 py-0.5">/premium</code> in Discord.
            </p>
          )}
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Design</h2>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="h-4 w-4" /> Load .json
                </Button>
                <Button variant="ghost" size="sm" onClick={loadSample}>
                  <Sparkles className="h-4 w-4" /> Sample
                </Button>
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-3 min-h-[340px] font-mono text-xs"
              placeholder={'{\n  "roles": [{ "name": "Member", "color": "#2ecc71" }],\n  "categories": [{ "name": "INFO", "channels": [{ "name": "rules", "type": "text" }] }],\n  "channels": [{ "name": "general", "type": "text" }]\n}'}
              spellCheck={false}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-ink-faint">
                Channel types: <code className="rounded bg-white/10 px-1">text</code>, <code className="rounded bg-white/10 px-1">voice</code>,{' '}
                <code className="rounded bg-white/10 px-1">announcement</code>, <code className="rounded bg-white/10 px-1">forum</code>,{' '}
                <code className="rounded bg-white/10 px-1">stage</code>. Additive — nothing is deleted.
              </p>
              <Button onClick={onGenerate} loading={generate.isPending} disabled={remaining <= 0}>
                <Wand2 className="h-4 w-4" /> Generate in this server
              </Button>
            </div>
            {remaining <= 0 && !usage.isLoading && (
              <p className="mt-2 text-xs text-amber-300/80">You've hit today's limit — it resets at UTC midnight.</p>
            )}
            {result && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm">
                <p className="font-medium text-emerald-300">Built ✓</p>
                <p className="mt-1 text-ink-muted">
                  {result.channels} channels · {result.categories} categories · {result.roles} roles
                </p>
                {result.warnings.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-amber-300/80">
                    {result.warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="grid gap-4">
          <GlassCard className="p-5">
            <h2 className="text-base font-semibold">Save this design</h2>
            <p className="mt-0.5 text-xs text-ink-faint">Keep it to reuse on any of your servers later.</p>
            <div className="mt-3 flex items-center gap-2">
              <Input value={saveName} maxLength={60} onChange={(e) => setSaveName(e.target.value)} placeholder="Template name" />
              <Button variant="secondary" onClick={onSave} loading={saveTpl.isPending}>
                Save
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-base font-semibold">Saved templates</h2>
            {saved.isLoading ? (
              <Skeleton className="mt-3 h-20 rounded-xl" />
            ) : saved.data && saved.data.length > 0 ? (
              <div className="mt-3 space-y-2">
                {saved.data.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <span className="truncate text-sm">{t.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => loadSaved(t)}>
                        Load
                      </Button>
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">No saved templates yet.</p>
            )}
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
