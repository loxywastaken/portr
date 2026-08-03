import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Send, Ticket as TicketIcon } from 'lucide-react';
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
import { useGuildCategories, useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import {
  useOpenTickets,
  useSaveTicketSettings,
  useSendTicketPanel,
  useTicketSettings,
  type TicketSettings,
} from '@/hooks/useTickets';
import { extractApiError } from '@/lib/api';

export default function Tickets() {
  const { guildId = '' } = useParams();
  const settings = useTicketSettings(guildId);
  const categories = useGuildCategories(guildId);
  const channels = useGuildChannels(guildId);
  const roles = useGuildRoles(guildId);
  const openTickets = useOpenTickets(guildId);
  const save = useSaveTicketSettings(guildId);
  const sendPanel = useSendTicketPanel(guildId);
  const toast = useToast();

  const [draft, setDraft] = useState<TicketSettings | null>(null);
  const [panelChannel, setPanelChannel] = useState('');

  useEffect(() => {
    if (settings.data && draft === null) setDraft(settings.data);
  }, [settings.data, draft]);

  const patch = (p: Partial<TicketSettings>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const categoryOpts = [{ value: '', label: '— none (create at top level) —' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const roleOpts = [{ value: '', label: 'None' }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))];
  const channelOpts = [{ value: '', label: 'None' }, ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))];
  const panelChannelOpts = [{ value: '', label: '— select a channel —' }, ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))];

  const onSave = async () => {
    if (!draft) return;
    try {
      await save.mutateAsync(draft);
      toast('Ticket settings saved.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onSendPanel = async () => {
    if (!panelChannel) return toast('Pick a channel to post the panel in.', 'error');
    try {
      await sendPanel.mutateAsync(panelChannel);
      toast('Ticket panel posted.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  if (settings.isLoading || !draft) {
    return (
      <PageTransition>
        <PageHeader title="Tickets" description="Let members open private support tickets." icon={TicketIcon} />
        <div className="grid gap-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Tickets"
        description="Let members open private support tickets with your staff."
        icon={TicketIcon}
        actions={
          <Button onClick={onSave} loading={save.isPending}>
            <Save className="h-4 w-4" /> Save
          </Button>
        }
      />

      <div className="grid gap-4">
        <GlassCard className="px-5">
          <Field label="Enabled" hint="Turn the ticket system on or off.">
            <Toggle checked={draft.enabled} onChange={(v) => patch({ enabled: v })} />
          </Field>
          <Field label="Ticket category" hint="New ticket channels are created under this category.">
            <Select value={draft.categoryId ?? ''} onChange={(v) => patch({ categoryId: v || null })} options={categoryOpts} className="w-64" />
          </Field>
          <Field label="Support role" hint="This role can see and reply to every ticket. Required to post a panel.">
            <Select value={draft.supportRoleId ?? ''} onChange={(v) => patch({ supportRoleId: v || null })} options={roleOpts} className="w-64" />
          </Field>
          <Field label="Transcript log channel" hint="Closed-ticket transcripts are posted here (optional).">
            <Select value={draft.logChannelId ?? ''} onChange={(v) => patch({ logChannelId: v || null })} options={channelOpts} className="w-64" />
          </Field>
        </GlassCard>

        <GlassCard className="px-5">
          <Field label="Button label" hint="Text on the “open a ticket” button.">
            <Input value={draft.buttonLabel} maxLength={80} onChange={(e) => patch({ buttonLabel: e.target.value })} className="w-64" placeholder="Open a ticket" />
          </Field>
          <Field label="Panel title" hint="Heading of the ticket panel embed.">
            <Input value={draft.panelTitle} maxLength={256} onChange={(e) => patch({ panelTitle: e.target.value })} className="w-full max-w-md" placeholder="🎫 Support Tickets" />
          </Field>
          <div className="border-t border-white/10 py-4">
            <div className="text-sm font-medium">Panel description</div>
            <Textarea value={draft.panelDescription} maxLength={2000} onChange={(e) => patch({ panelDescription: e.target.value })} className="mt-2" placeholder="Need help? Click below to open a private ticket." />
          </div>
          <div className="pb-4">
            <div className="text-sm font-medium">Ticket welcome message</div>
            <p className="mt-0.5 text-xs text-ink-faint">Shown at the top of every new ticket.</p>
            <Textarea value={draft.welcomeMessage} maxLength={1000} onChange={(e) => patch({ welcomeMessage: e.target.value })} className="mt-2" placeholder="Thanks for reaching out — a staff member will be with you shortly." />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Post the panel</h2>
              <p className="mt-0.5 text-xs text-ink-faint">Save your settings first, then post the panel to a channel members can see.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={panelChannel} onChange={setPanelChannel} options={panelChannelOpts} className="w-56" />
              <Button variant="secondary" onClick={onSendPanel} loading={sendPanel.isPending}>
                <Send className="h-4 w-4" /> Send panel
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Open tickets</h2>
            <Badge>{openTickets.data?.length ?? 0}</Badge>
          </div>
          {openTickets.data && openTickets.data.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {openTickets.data.map((t) => (
                <span key={t.channelId} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs text-ink-muted">
                  #{t.number} · <span className="text-ink-faint">{`<@${t.userId}>`.replace(/[<@>]/g, '')}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">No open tickets right now.</p>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
