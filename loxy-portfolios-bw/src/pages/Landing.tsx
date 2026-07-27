import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  ShieldCheck,
  Sparkles,
  Zap,
  Gavel,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { DiscordIcon } from '@/components/common/DiscordIcon';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Gavel,
    title: 'Moderation suite',
    description: 'Ban, kick, timeout, warn, purge and lockdown — every action logged as a numbered case.',
  },
  {
    icon: Sparkles,
    title: 'Welcome system',
    description: 'Greet new members with rich embeds, a live preview and dynamic variables.',
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    description: 'Command usage, member growth and moderation trends in interactive charts.',
  },
  {
    icon: Zap,
    title: 'Live dashboard',
    description: 'Bot ping, uptime, CPU and RAM streamed to your browser over WebSockets.',
  },
  {
    icon: Bot,
    title: 'Utility commands',
    description: 'serverinfo, userinfo, avatar, ping and a self-documenting help command.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    description: 'Discord OAuth2, JWT sessions, CSRF protection, rate limiting and validated input.',
  },
];

export default function Landing() {
  const { user, login } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-grid-faint [background-size:40px_40px]">
      <div className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight">Loxy&apos;s Portfolios</span>
        </div>
        {user ? (
          <Link to="/servers">
            <Button size="sm">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button size="sm" variant="secondary" onClick={login}>
            <DiscordIcon className="h-4 w-4" /> Sign in
          </Button>
        )}
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Premium Discord management, reimagined
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            <span className="text-gradient">Run your Discord</span>
            <br />
            like a product, not a chore.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
            A powerful discord.js bot paired with a real-time dashboard — moderation, welcomes,
            analytics and settings, all in one polished control center.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Link to="/servers">
                <Button size="lg">
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={login}>
                <DiscordIcon className="h-5 w-5" /> Login with Discord
              </Button>
            )}
            <a href="#features">
              <Button size="lg" variant="outline">
                Explore features
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard className="h-full p-6 transition-colors duration-300 hover:border-brand-500/30">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-ink-faint">
        Built with discord.js, React &amp; TypeScript · Loxy&apos;s Portfolios
      </footer>
    </div>
  );
}
