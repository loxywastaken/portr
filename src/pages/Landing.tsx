import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Gavel,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DiscordIcon } from '@/components/common/DiscordIcon';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';

const features: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Gavel, title: 'Moderation', description: 'Bans, timeouts, warns and purges, logged as cases.' },
  { icon: Sparkles, title: 'Welcomes', description: 'Rich embed greetings with a live preview.' },
  { icon: BarChart3, title: 'Analytics', description: 'Command usage and member growth charts.' },
  { icon: Zap, title: 'Live stats', description: 'Ping, uptime, CPU and RAM in real time.' },
  { icon: Bot, title: '50+ commands', description: 'Roles, utilities, fun and custom commands.' },
  { icon: ShieldCheck, title: 'Secure', description: 'Discord OAuth2, CSRF protection, rate limits.' },
];

export default function Landing() {
  const { user, login } = useAuth();

  const cta = user ? (
    <Link to="/servers">
      <Button size="lg">
        Open dashboard <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  ) : (
    <Button size="lg" onClick={login}>
      <DiscordIcon className="h-5 w-5" /> Login with Discord
    </Button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight">Nexus Service</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/premium">
            <Button size="sm" variant="ghost">
              Premium
            </Button>
          </Link>
          <Link to="/updates">
            <Button size="sm" variant="ghost">
              Updates
            </Button>
          </Link>
          {!user && (
            <Button size="sm" variant="secondary" onClick={login}>
              <DiscordIcon className="h-4 w-4" /> Sign in
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="py-16 text-center sm:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your Discord server, <span className="text-gradient">managed in one place.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">
            Moderation, welcomes, tickets and live analytics for the Nexus bot.
          </p>
          <div className="mt-8 flex justify-center">{cta}</div>
        </section>

        <section className="grid gap-x-8 gap-y-6 border-t border-white/10 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
              <div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{f.description}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-ink-faint">
        Nexus Service · made by <span className="text-ink-muted">zxme</span> &amp;{' '}
        <span className="text-ink-muted">veer</span>
      </footer>
    </div>
  );
}
