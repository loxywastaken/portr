import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { SUPPORT_INVITE } from './Privacy';

const UPDATED = '24 November 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function Terms() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-1 text-sm text-ink-muted">Last updated {UPDATED}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            These terms cover your use of the Nexus Discord bot and the dashboard at evolutions.lol (together,
            &quot;Nexus&quot;), run by zxme &amp; veer. By adding Nexus to a server or signing in to the dashboard, you
            agree to them.
          </p>
        </div>

        <Section title="Using Nexus">
          <p>
            You must follow Discord&apos;s Terms of Service and Community Guidelines while using Nexus. Don&apos;t use
            Nexus to harass people, spam, raid servers, break the law, or try to break, overload or get around the bot,
            the dashboard or their limits.
          </p>
          <p>
            Server admins are responsible for how Nexus is set up in their server, including its moderation actions,
            messages and the content of panels, tickets and applications.
          </p>
        </Section>

        <Section title="Premium">
          <p>
            Some features need Premium, which is paid through PayPal and activated by the owners. Premium can be
            changed or ended if these terms are broken. Questions about payments go through our Discord server.
          </p>
        </Section>

        <Section title="Availability">
          <p>
            Nexus is provided as it is, without guarantees. Features can change, and the bot or dashboard can be
            unavailable at times. We aren&apos;t responsible for losses caused by downtime, bugs or how a server uses
            Nexus.
          </p>
        </Section>

        <Section title="Ending access">
          <p>
            You can stop using Nexus at any time by removing the bot from your server. We can remove Nexus from a
            server or block a user from the dashboard if these terms are broken.
          </p>
        </Section>

        <Section title="Your data">
          <p>
            How we handle data is described in our{' '}
            <Link to="/privacy" className="text-ink underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Changes and contact">
          <p>
            We may update these terms; changes are posted on the{' '}
            <Link to="/updates" className="text-ink underline underline-offset-2">
              Updates
            </Link>{' '}
            page. For questions, join our Discord server at{' '}
            <a href={SUPPORT_INVITE} className="text-ink underline underline-offset-2" target="_blank" rel="noreferrer">
              {SUPPORT_INVITE.replace('https://', '')}
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
