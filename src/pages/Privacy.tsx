import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';

/** Where people ask for their data to be deleted. Keep in sync with the Discord intents application. */
export const SUPPORT_INVITE = 'https://discord.gg/MjratHQeef';
const UPDATED = '24 November 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto text-white" />
            <span className="font-semibold tracking-tight">Nexus Service</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-1 text-sm text-ink-muted">Last updated {UPDATED}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            This policy explains what the Nexus Discord bot and the dashboard at evolutions.lol collect, why, how long
            it is kept, and how to have it deleted. Nexus is run by zxme &amp; veer.
          </p>
        </div>

        <Section title="What we collect">
          <List
            items={[
              <>
                <strong className="text-ink">Dashboard login:</strong> when you sign in with Discord we store your Discord
                user ID, username, display name, avatar and the login tokens Discord gives us, so we can show the servers
                you manage. We only ask Discord for the <code>identify</code> and <code>guilds</code> scopes.
              </>,
              <>
                <strong className="text-ink">Server settings:</strong> everything admins configure for their server, such
                as welcome messages, roles, channels, Auto Mod rules, tickets, applications and giveaways.
              </>,
              <>
                <strong className="text-ink">Member activity:</strong> user IDs with XP and levels, message and voice
                activity counts for leaderboards, and daily join, leave and command counts. We store counts, not message
                text.
              </>,
              <>
                <strong className="text-ink">Moderation records:</strong> moderation cases (action, member, moderator and
                reason), ticket and application records including application answers, and an audit log of dashboard
                changes.
              </>,
              <>
                <strong className="text-ink">Server logs:</strong> if a server turns on logging, member joins and leaves and
                the text of edited or deleted messages are stored for that server&apos;s log.
              </>,
            ]}
          />
        </Section>

        <Section title="Message content">
          <p>
            Nexus reads message text only for two features that server admins turn on: Auto Mod, which checks new
            messages for blocked words, links, mass mentions and caps, and the message log, which records edited and
            deleted messages. Message text is not used for anything else, is never used for analytics or profiling,
            and is never used to train machine learning or AI models.
          </p>
        </Section>

        <Section title="How long we keep it">
          <List
            items={[
              'Server log entries, including any stored message text, are deleted automatically after 30 days.',
              'Unfinished application drafts expire automatically.',
              'Other data is kept while the bot is in the server or you use the dashboard, and is deleted on request.',
            ]}
          />
        </Section>

        <Section title="How it is used and shared">
          <p>
            Data is used only to run Nexus features inside the server it came from and to show them on the dashboard.
            We do not sell or rent data, share it with advertisers, or give it to third parties, except where the law
            requires it. Data is stored in a MongoDB Atlas database, which is encrypted at rest and only reached over
            encrypted (TLS) connections.
          </p>
          <p>
            Premium is paid through PayPal outside of Nexus. We never see or store your payment details.
          </p>
        </Section>

        <Section title="Your choices and deleting your data">
          <p>
            Server admins can turn off Auto Mod, logging, leveling and other features at any time from the dashboard.
            You can remove Nexus from a server, or sign out of the dashboard, whenever you like.
          </p>
          <p>
            To get a copy of your data or have it deleted, join our Discord server at{' '}
            <a href={SUPPORT_INVITE} className="text-ink underline underline-offset-2" target="_blank" rel="noreferrer">
              {SUPPORT_INVITE.replace('https://', '')}
            </a>{' '}
            and open a ticket or message the owners with your Discord user ID. We handle requests within 30 days.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes we will update the date above and post the change on the{' '}
            <Link to="/updates" className="text-ink underline underline-offset-2">
              Updates
            </Link>{' '}
            page.
          </p>
        </Section>
      </main>
    </div>
  );
}
