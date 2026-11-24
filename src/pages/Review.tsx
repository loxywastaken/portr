import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';

/**
 * Unlisted page for Discord's privileged intents review: screenshots of features
 * that need the Server Members intent, working in a real server.
 * Other members' names and avatars are blurred.
 */
const shots = [
  {
    src: '/review/welcome-messages.png',
    title: 'Welcome messages on member join',
    text: 'When someone joins, Nexus receives the member-join event and posts a welcome embed with the member mention and their member number in the server’s welcome channel. Other members’ names and avatars are blurred.',
  },
  {
    src: '/review/welcome-settings.png',
    title: 'Welcome setup in the Nexus dashboard',
    text: 'Server admins choose the channel, message, embed and whether to mention the new member, with a live preview. The same member-join event also drives autorole and anti-raid join checks.',
  },
];

export default function Review() {
  // Keep this page out of search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto text-white" />
            <span className="font-semibold tracking-tight">Nexus Service</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Server Members intent: use case</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Screenshots from the Nexus Service Discord server showing why Nexus Bot needs the Server Members intent.
            Privacy policy:{' '}
            <Link to="/privacy" className="text-ink underline underline-offset-2">
              evolutions.lol/privacy
            </Link>
            .
          </p>
        </div>

        {shots.map((s) => (
          <figure key={s.src} className="space-y-3">
            <figcaption>
              <h2 className="font-medium">{s.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{s.text}</p>
            </figcaption>
            <a href={s.src} target="_blank" rel="noreferrer">
              <img src={s.src} alt={s.title} className="w-full rounded-xl border" loading="lazy" />
            </a>
          </figure>
        ))}
      </main>
    </div>
  );
}
