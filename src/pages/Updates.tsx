import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { updates, type UpdateArea } from '@/lib/updates';

type Filter = 'All' | UpdateArea;

const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function Updates() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('All');

  // Group by month, keeping the newest-first order of the list.
  const months = useMemo(() => {
    const shown = updates.filter((u) => filter === 'All' || u.areas.includes(filter));
    const groups: { month: string; items: typeof shown }[] = [];
    for (const u of shown) {
      const month = monthFmt.format(new Date(u.date));
      const last = groups[groups.length - 1];
      if (last?.month === month) last.items.push(u);
      else groups.push({ month, items: [u] });
    }
    return groups;
  }, [filter]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
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

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Updates</h1>
        <p className="mt-1 text-sm text-ink-muted">Everything new in the Nexus dashboard and bot.</p>

        <div className="mt-6 inline-flex rounded-lg border p-0.5 text-sm">
          {(['All', 'Site', 'Bot'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 transition-colors',
                filter === f ? 'bg-white/[0.08] font-medium text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-10">
          {months.map(({ month, items }) => (
            <section key={month}>
              <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-ink-faint">{month}</h2>
              <ol className="space-y-3">
                {items.map((u) => (
                  <li key={u.date + u.title} className="rounded-xl border bg-surface-soft p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time dateTime={u.date} className="text-xs text-ink-faint">
                        {dayFmt.format(new Date(u.date))}
                      </time>
                      {u.areas.map((a) => (
                        <span key={a} className="rounded border px-1.5 py-px text-[11px] text-ink-muted">
                          {a}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-2 font-medium">{u.title}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                      {u.changes.map((c) => (
                        <li key={c} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
