import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { HOW_TO_BUY, PAYPAL_URL, PREMIUM_PERKS, PREMIUM_PRICE } from '@/lib/premium';

/** Public Premium page: perks, free vs premium, price and how to buy. */
export default function PremiumInfo() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto text-white" />
            <span className="font-semibold tracking-tight">Nexus Service</span>
          </Link>
          <Link to={user ? '/servers' : '/'}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> {user ? 'Servers' : 'Home'}
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-300">
            <Crown className="h-3.5 w-3.5" /> Nexus Premium
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Make Nexus your own bot.</h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            Custom branding, advanced leveling, searchable logs and longer analytics — for {PREMIUM_PRICE}, on up to 2 servers.
          </p>
          <a href={PAYPAL_URL} target="_blank" rel="noreferrer" className="mt-6 inline-block">
            <Button size="lg">
              Get Premium · {PREMIUM_PRICE} <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>

        <div className="mt-12 overflow-x-auto rounded-xl border bg-surface-soft">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">Feature</th>
                <th className="px-5 py-3 font-medium">Free</th>
                <th className="px-5 py-3 font-medium text-amber-300">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PREMIUM_PERKS.map((p) => (
                <tr key={p.title}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <p.icon className="h-4 w-4 text-ink-muted" /> {p.title}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-faint">{p.description}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{p.free}</td>
                  <td className="whitespace-nowrap px-5 py-3">{p.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12">
          <h2 className="text-sm font-semibold">How to get it</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {HOW_TO_BUY.map((step, i) => (
              <li key={step} className="rounded-xl border bg-surface-soft p-5 text-sm">
                <div className="text-xs text-ink-faint">Step {i + 1}</div>
                <div className="mt-1 text-ink-muted">{step}</div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
