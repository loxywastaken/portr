import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ClipboardCopy,
  Info,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { DiscordPanelPreview } from '@/components/common/DiscordPanelPreview';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { ColorInput } from '@/components/ui/ColorInput';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/toast';
import { useGuildChannels, useGuildOverview, useGuildRoles } from '@/hooks/useGuild';
import {
  isPanelsUnsupported,
  readDraft,
  useAllGuildRoles,
  usePanels,
  usePublishPanel,
  useSavePanel,
  writeDraft,
} from '@/hooks/usePanels';
import {
  PANEL_KINDS,
  buildMessages,
  emptyItem,
  emptyPanel,
  emptySection,
  generatePanel,
  type InfoPanel,
  type PanelItem,
  type PanelKind,
  type PanelSection,
  type PanelTone,
  type ServerNiche,
} from '@/lib/panels';
import { extractApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const NICHES: { value: ServerNiche; label: string }[] = [
  { value: 'community', label: 'Community / Social' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'development', label: 'Development / Studios' },
  { value: 'creator', label: 'Content Creators' },
  { value: 'business', label: 'Business / Networking' },
];

const TONES: { value: PanelTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'strict', label: 'Strict' },
];

type PanelMap = Record<PanelKind, InfoPanel>;

function guildIconUrl(id: string, icon: string | null | undefined): string | undefined {
  return icon
    ? `https://cdn.discordapp.com/icons/${id}/${icon}.${icon.startsWith('a_') ? 'gif' : 'png'}?size=256`
    : undefined;
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export default function Panels() {
  const { guildId = '' } = useParams();
  // Keyed so switching servers starts from that server's panels.
  return <PanelsEditor key={guildId} guildId={guildId} />;
}

function PanelsEditor({ guildId }: { guildId: string }) {
  const overview = useGuildOverview(guildId);
  const channels = useGuildChannels(guildId);
  const allRoles = useAllGuildRoles(guildId);
  const assignable = useGuildRoles(guildId);
  const saved = usePanels(guildId);
  const savePanel = useSavePanel(guildId);
  const publish = usePublishPanel(guildId);
  const toast = useToast();

  const roles = useMemo(
    () => allRoles.data ?? assignable.data ?? [],
    [allRoles.data, assignable.data],
  );
  const guildName = overview.data?.name ?? 'Our Server';
  const iconUrl = guildIconUrl(guildId, overview.data?.icon);

  const [kind, setKind] = useState<PanelKind>('rules');
  const [panels, setPanels] = useState<PanelMap | null>(null);
  const [channelId, setChannelId] = useState('');
  const [gen, setGen] = useState({
    serverName: '',
    tagline: '',
    niche: 'community' as ServerNiche,
    tone: 'professional' as PanelTone,
  });
  const [generating, setGenerating] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Seed every tab once: saved on the bot → local draft → empty.
  useEffect(() => {
    if (panels || saved.isLoading) return;
    const fromServer = saved.data?.panels ?? {};
    const seeded = Object.fromEntries(
      PANEL_KINDS.map(({ kind: k }) => [
        k,
        fromServer[k] ?? readDraft(guildId, k) ?? emptyPanel(k),
      ]),
    ) as PanelMap;
    setPanels(seeded);
  }, [panels, saved.isLoading, saved.data, guildId]);

  useEffect(() => {
    if (overview.data && !gen.serverName)
      setGen((g) => ({ ...g, serverName: overview.data!.name }));
  }, [overview.data, gen.serverName]);

  const panel = panels?.[kind] ?? emptyPanel(kind);
  const messages = useMemo(() => buildMessages(panel), [panel]);
  const embedCount = messages.reduce((n, m) => n + m.embeds.length, 0);
  const supported = saved.data?.supported ?? true;

  const roleLookup = useMemo(
    () => new Map(roles.map((r) => [r.id, { name: r.name, color: r.color }])),
    [roles],
  );
  const channelLookup = useMemo(
    () => new Map((channels.data ?? []).map((c) => [c.id, c.name])),
    [channels.data],
  );
  const roleOptions = useMemo(
    () =>
      [...roles]
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ value: r.id, label: `@${r.name}` })),
    [roles],
  );
  const channelOptions = (channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }));

  const update = (patch: Partial<InfoPanel>) =>
    setPanels((prev) => (prev ? { ...prev, [kind]: { ...prev[kind], ...patch } } : prev));
  const updateSection = (id: string, patch: Partial<PanelSection>) =>
    update({ sections: panel.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  // Persist drafts locally as you type so nothing is lost on reload.
  useEffect(() => {
    if (!panels) return;
    const t = window.setTimeout(() => writeDraft(guildId, panels[kind]), 400);
    return () => window.clearTimeout(t);
  }, [panels, kind, guildId]);

  const runGenerator = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    const result = generatePanel({ kind, ...gen, roles, iconUrl });
    setGenerating(true);
    update({ ...result, sections: [] });
    // Reveal sections one at a time so the result is easy to follow.
    result.sections.forEach((section, i) => {
      timers.current.push(
        window.setTimeout(
          () => {
            setPanels((prev) =>
              prev
                ? {
                    ...prev,
                    [kind]: { ...prev[kind], sections: [...prev[kind].sections, section] },
                  }
                : prev,
            );
            if (i === result.sections.length - 1) setGenerating(false);
          },
          180 * (i + 1),
        ),
      );
    });
    if (!result.sections.length) setGenerating(false);
  };

  const onSave = async () => {
    try {
      await savePanel.mutateAsync(panel);
      toast('Panel saved — the bot can now post it with /panel post.');
    } catch (err) {
      if (isPanelsUnsupported(err))
        toast('Saved in this browser. Update the bot to save panels to the server.', 'info');
      else toast(extractApiError(err).message, 'error');
    }
  };

  const onPublish = async () => {
    if (!channelId) return toast('Pick a channel to post in.', 'error');
    if (!panel.sections.length && !panel.description.trim())
      return toast('This panel is empty — generate or add a section first.', 'error');
    try {
      await publish.mutateAsync({ panel, channelId });
      toast(`Posted to #${channelLookup.get(channelId) ?? 'channel'}!`);
    } catch (err) {
      if (isPanelsUnsupported(err))
        toast('Your bot does not support publishing panels yet — use Copy JSON for now.', 'error');
      else toast(extractApiError(err).message, 'error');
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(messages.length === 1 ? messages[0] : messages, null, 2),
      );
      toast('Message JSON copied — paste it into Discohook or any embed tool.');
    } catch {
      toast('Clipboard is blocked in this browser.', 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Info Panels"
        description="Rules, staff rules, role information and server info — generated in seconds, linked to your real roles."
        icon={ScrollText}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {PANEL_KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(k.kind)}
            className={cn(
              'rounded-xl p-3 text-left ring-1 ring-inset transition',
              kind === k.kind
                ? 'bg-white/10 ring-white/25'
                : 'bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]',
            )}
          >
            <div className="text-sm font-semibold">{k.label}</div>
            <div className="mt-0.5 text-xs text-ink-faint">{k.blurb}</div>
          </button>
        ))}
      </div>

      {!supported && (
        <GlassCard className="mb-4 flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-ink-muted">
            Your bot hasn&apos;t been updated with the panels API yet. Drafts are kept in this
            browser, and you can <strong className="text-ink">Copy JSON</strong> to post a panel
            through any embed tool in the meantime.
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {/* Generator */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-200" />
              <h2 className="text-base font-semibold">Generate</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Describe your server and get a complete, polished panel. Role panels sort and describe
              your actual roles automatically.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Server name"
                value={gen.serverName}
                onChange={(v) => setGen({ ...gen, serverName: v })}
              />
              <LabeledInput
                label="Tagline (optional)"
                value={gen.tagline}
                placeholder="A networking hub for creators & studios"
                onChange={(v) => setGen({ ...gen, tagline: v })}
              />
              <div>
                <Label>Server type</Label>
                <Select
                  value={gen.niche}
                  onChange={(v) => setGen({ ...gen, niche: v as ServerNiche })}
                  options={NICHES}
                />
              </div>
              <div>
                <Label>Tone</Label>
                <Select
                  value={gen.tone}
                  onChange={(v) => setGen({ ...gen, tone: v as PanelTone })}
                  options={TONES}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={runGenerator} loading={generating}>
                <Sparkles className="h-4 w-4" /> {panel.sections.length ? 'Regenerate' : 'Generate'}
              </Button>
              {kind === 'roles' && (
                <span className="text-xs text-ink-faint">
                  {allRoles.isLoading ? 'Loading roles…' : `${roles.length} roles found`}
                </span>
              )}
            </div>
          </GlassCard>

          {/* Appearance */}
          <GlassCard className="space-y-3 p-5">
            <h2 className="text-base font-semibold">Panel</h2>
            <LabeledInput
              label="Title"
              value={panel.title}
              maxLength={256}
              onChange={(v) => update({ title: v })}
            />
            <div>
              <Label>Intro</Label>
              <Textarea
                value={panel.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Thumbnail URL"
                value={panel.thumbnailUrl}
                placeholder={iconUrl ? 'Server icon' : 'https://…'}
                onChange={(v) => update({ thumbnailUrl: v })}
              />
              <LabeledInput
                label="Banner image URL"
                value={panel.imageUrl}
                placeholder="https://…"
                onChange={(v) => update({ imageUrl: v })}
              />
            </div>
            <LabeledInput
              label="Footer"
              value={panel.footer}
              onChange={(v) => update({ footer: v })}
            />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <div>
                <Label>Accent colour</Label>
                <ColorInput value={panel.color} onChange={(v) => update({ color: v })} />
              </div>
              <div>
                <Label>Layout</Label>
                <Select
                  value={panel.layout}
                  onChange={(v) => update({ layout: v as InfoPanel['layout'] })}
                  options={[
                    { value: 'single', label: 'One embed' },
                    { value: 'sections', label: 'Card per section' },
                  ]}
                  className="w-44"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <Toggle
                  checked={panel.numbered}
                  onChange={(v) => update({ numbered: v })}
                  aria-label="Number sections"
                />
                Number sections
              </label>
            </div>
          </GlassCard>

          {/* Sections */}
          <AnimatePresence initial={false}>
            {panel.sections.map((section, index) => (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <SectionEditor
                  section={section}
                  index={index}
                  total={panel.sections.length}
                  roleOptions={roleOptions}
                  channelOptions={channelOptions}
                  onChange={(patch) => updateSection(section.id, patch)}
                  onMove={(dir) => update({ sections: move(panel.sections, index, index + dir) })}
                  onRemove={() =>
                    update({ sections: panel.sections.filter((s) => s.id !== section.id) })
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => update({ sections: [...panel.sections, emptySection()] })}
            >
              <Plus className="h-4 w-4" /> Add section
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                update(emptyPanel(kind));
                toast('Panel cleared.', 'info');
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        {/* Preview + publish */}
        <div className="min-w-0">
          <div className="space-y-4 xl:sticky xl:top-6">
            <GlassCard className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Post to Discord</h2>
                <Badge>
                  {messages.length} message{messages.length === 1 ? '' : 's'} · {embedCount} embed
                  {embedCount === 1 ? '' : 's'}
                </Badge>
              </div>
              <Select
                value={channelId}
                onChange={setChannelId}
                options={channelOptions}
                placeholder={channels.isLoading ? 'Loading…' : 'Select a channel'}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={onPublish} loading={publish.isPending} disabled={!channelId}>
                  <Send className="h-4 w-4" /> Publish
                </Button>
                <Button variant="secondary" onClick={onSave} loading={savePanel.isPending}>
                  <Save className="h-4 w-4" /> Save
                </Button>
                <Button variant="outline" onClick={onCopy}>
                  <ClipboardCopy className="h-4 w-4" /> Copy JSON
                </Button>
              </div>
              <p className="text-xs text-ink-faint">
                Role mentions inside panels are clickable but never ping anyone, so posting is
                always safe.
              </p>
            </GlassCard>

            <div className="scrollbar-thin max-h-[calc(100vh-14rem)] overflow-y-auto rounded-xl">
              <DiscordPanelPreview
                messages={messages}
                botName={guildName}
                avatarUrl={iconUrl}
                roles={roleLookup}
                channels={channelLookup}
              />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function Label({ children }: { children: string }) {
  return <label className="mb-1.5 block text-xs font-medium text-ink-muted">{children}</label>;
}

function LabeledInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <Input
        value={props.value}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

interface SectionEditorProps {
  section: PanelSection;
  index: number;
  total: number;
  roleOptions: { value: string; label: string }[];
  channelOptions: { value: string; label: string }[];
  onChange: (patch: Partial<PanelSection>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function SectionEditor({
  section,
  index,
  total,
  roleOptions,
  channelOptions,
  onChange,
  onMove,
  onRemove,
}: SectionEditorProps) {
  const updateItem = (id: string, patch: Partial<PanelItem>) =>
    onChange({ items: section.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const insert = (token: string) =>
    onChange({ body: section.body ? `${section.body} ${token}` : token });

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-2">
        <Input
          value={section.emoji}
          onChange={(e) => onChange({ emoji: e.target.value })}
          placeholder="📜"
          className="w-14 text-center"
        />
        <Input
          value={section.heading}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="Section heading"
        />
        <div className="flex shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove section">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Input
        value={section.subheading}
        onChange={(e) => onChange({ subheading: e.target.value })}
        placeholder="Sub-heading (optional), e.g. Studio Roles"
        className="mt-2"
      />

      <Textarea
        value={section.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder={'Text for this section. Markdown works: **bold**, - bullets, > quotes'}
        className="mt-2"
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Select
          value=""
          onChange={(id) => id && insert(`<@&${id}>`)}
          options={roleOptions}
          placeholder="Insert role mention…"
        />
        <Select
          value=""
          onChange={(id) => id && insert(`<#${id}>`)}
          options={channelOptions}
          placeholder="Insert channel…"
        />
      </div>

      {section.items.length > 0 && (
        <div className="mt-4 space-y-2">
          {section.items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/10"
            >
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select
                  value={item.roleId ?? ''}
                  onChange={(v) => updateItem(item.id, { roleId: v || null })}
                  options={[{ value: '', label: 'No role (label only)' }, ...roleOptions]}
                />
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  placeholder="Column heading / label"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange({ items: section.items.filter((i) => i.id !== item.id) })}
                  aria-label="Remove role"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                placeholder="Requirements or description — one bullet per line"
                className="mt-2 min-h-[64px]"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <Toggle
                  checked={item.inline}
                  onChange={(v) => updateItem(item.id, { inline: v })}
                  aria-label="Show as column"
                />
                Show as a column (card layout)
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange({ items: [...section.items, emptyItem()] })}
        >
          <Plus className="h-3.5 w-3.5" /> Add role entry
        </Button>
        <Input
          value={section.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Small print (optional)"
          className="h-8 flex-1 py-1 text-xs"
        />
      </div>
    </GlassCard>
  );
}
