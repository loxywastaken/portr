import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, Megaphone, Plus, Trash2 } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import { useCreateFeed, useDeleteFeed, useFeeds, type FeedPlatform } from '@/hooks/useFeeds';
import { extractApiError } from '@/lib/api';

const PLATFORMS: { value: FeedPlatform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'rss', label: 'Other RSS/Atom' },
];

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  twitter: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  rss: 'RSS',
};

const HINTS: Record<FeedPlatform, { placeholder: string; hint: string }> = {
  youtube: { placeholder: 'youtube.com/@YourChannel  (or a channel URL / ID)', hint: 'Paste your channel URL, @handle, or channel ID — the bot finds the right feed automatically.' },
  twitter: { placeholder: 'https://rss.app/feeds/xxxxxxxx.xml', hint: 'X has no free feed — make one with the generator below, then paste its feed link here.' },
  instagram: { placeholder: 'https://rss.app/feeds/xxxxxxxx.xml', hint: 'Instagram has no free feed — make one with the generator below, then paste its feed link here.' },
  tiktok: { placeholder: 'https://rss.app/feeds/xxxxxxxx.xml', hint: 'TikTok has no free feed — make one with the generator below, then paste its feed link here.' },
  rss: { placeholder: 'https://example.com/feed.xml', hint: 'Any standard RSS or Atom feed URL — blogs, Reddit, YouTube, Mastodon, Twitch and more.' },
};

/** Platforms with no free feed the bot can read — we guide the user to a feed generator. */
const NEEDS_GENERATOR = new Set<FeedPlatform>(['twitter', 'instagram', 'tiktok']);

export default function Socials() {
  const { guildId = '' } = useParams();
  const { user, loading } = useAuth();
  const feeds = useFeeds(guildId);
  const channels = useGuildChannels(guildId);
  const roles = useGuildRoles(guildId);
  const create = useCreateFeed(guildId);
  const del = useDeleteFeed(guildId);
  const toast = useToast();

  const [platform, setPlatform] = useState<FeedPlatform>('youtube');
  const [input, setInput] = useState('');
  const [channelId, setChannelId] = useState('');
  const [label, setLabel] = useState('');
  const [mentionRoleId, setMentionRoleId] = useState('');

  const isPremium = Boolean(user?.isPremium);

  const channelOpts = [{ value: '', label: '— select a channel —' }, ...(channels.data ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))];
  const roleOpts = [{ value: '', label: 'No mention' }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))];

  const onCreate = async () => {
    if (!input.trim()) return toast('Enter the channel ID or feed URL.', 'error');
    if (!channelId) return toast('Pick a Discord channel to post to.', 'error');
    try {
      await create.mutateAsync({ platform, input: input.trim(), channelId, label: label.trim() || undefined, mentionRoleId: mentionRoleId || null });
      toast('Connected — new posts will auto-relay here. 🎉');
      setInput('');
      setLabel('');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast('Removed.');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  const header = (
    <PageHeader
      title="Social Auto-Post"
      description="Connect your feeds and the bot auto-posts new content to a Discord channel to promote it."
      icon={Megaphone}
    />
  );

  if (loading) {
    return (
      <PageTransition>
        {header}
        <Skeleton className="h-40 rounded-2xl" />
      </PageTransition>
    );
  }

  if (!isPremium) {
    return (
      <PageTransition>
        {header}
        <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">This is a Premium feature</h2>
          <p className="max-w-md text-sm text-ink-muted">
            Auto-posting your socials into Discord is part of Nexus Premium. Unlock it for <span className="text-ink">£5</span> — pay at{' '}
            <a className="text-ink underline decoration-white/30 hover:decoration-white" href="https://paypal.me/zxmee/5" target="_blank" rel="noreferrer">
              paypal.me/zxmee
            </a>{' '}
            then run <code className="rounded bg-white/10 px-1.5 py-0.5">/premium</code> in Discord.
          </p>
        </GlassCard>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {header}
      <div className="grid gap-4">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold">Connect a feed</h2>
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Platform">
                <Select value={platform} onChange={(v) => setPlatform(v as FeedPlatform)} options={PLATFORMS} className="w-44" />
              </Field>
              <Field label="Post to channel">
                <Select value={channelId} onChange={setChannelId} options={channelOpts} className="w-56" />
              </Field>
              <Field label="Ping role (optional)">
                <Select value={mentionRoleId} onChange={setMentionRoleId} options={roleOpts} className="w-44" />
              </Field>
            </div>
            <Field
              label={platform === 'youtube' ? 'Channel URL, @handle or ID' : platform === 'rss' ? 'Feed URL' : 'Feed URL (from a generator)'}
              hint={HINTS[platform].hint}
            >
              <Input value={input} onChange={(e) => setInput(e.target.value)} className="w-full max-w-xl" placeholder={HINTS[platform].placeholder} />
            </Field>
            {NEEDS_GENERATOR.has(platform) && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-ink-muted">
                <p className="font-medium text-amber-200/90">{PLATFORM_LABEL[platform] ?? platform} doesn't offer a free feed the bot can read.</p>
                <p className="mt-1">
                  Quick fix: create a free feed for your profile with a generator like{' '}
                  <a href="https://rss.app" target="_blank" rel="noreferrer" className="text-ink underline decoration-white/30 hover:decoration-white">
                    rss.app
                  </a>{' '}
                  (free tier, ~2 min), copy the feed link it gives you, and paste it above. The bot reads that link and auto-posts new content here — with the{' '}
                  {PLATFORM_LABEL[platform] ?? platform} badge and your optional role ping.
                </p>
              </div>
            )}
            <Field label="Label (optional)" hint="Shown on each post, e.g. your brand name.">
              <Input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} className="w-64" placeholder="My Channel" />
            </Field>
            <div>
              <Button onClick={onCreate} loading={create.isPending}>
                <Plus className="h-4 w-4" /> Connect feed
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-base font-semibold">Connected feeds</h2>
          {feeds.isLoading ? (
            <Skeleton className="mt-3 h-20 rounded-xl" />
          ) : feeds.data && feeds.data.length > 0 ? (
            <div className="mt-3 space-y-2">
              {feeds.data.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="brand">{PLATFORM_LABEL[f.platform] ?? f.platform}</Badge>
                      <span className="truncate text-sm font-medium">{f.label || f.feedUrl}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-faint">
                      → posts in the chosen channel{f.lastPostedAt ? ` · last posted ${new Date(f.lastPostedAt).toLocaleDateString()}` : ' · waiting for the next post'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(f.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Remove feed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">No feeds connected yet. Add one above — the bot checks for new posts every few minutes.</p>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
