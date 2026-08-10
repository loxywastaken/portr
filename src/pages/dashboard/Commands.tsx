import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCommands, type CommandInfo } from '@/hooks/useCommands';

export default function Commands() {
  const { data, isLoading } = useCommands();
  const [q, setQ] = useState('');

  const grouped = useMemo(() => {
    const cmds = data?.commands ?? [];
    const query = q.trim().toLowerCase();
    const filtered = query
      ? cmds.filter(
          (c) =>
            c.name.includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.category.toLowerCase().includes(query) ||
            c.subcommands.some((s) => s.name.includes(query)),
        )
      : cmds;
    const map = new Map<string, CommandInfo[]>();
    for (const c of filtered) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data, q]);

  return (
    <PageTransition>
      <PageHeader
        title="Commands"
        description={`Every command Nexus Service can run${data ? ` — ${data.total} total` : ''}. Type / in Discord, or run /commands.`}
        icon={BookOpen}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commands…" className="w-full pl-9" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : grouped.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([category, cmds]) => (
            <GlassCard key={category} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{category}</h2>
                <Badge variant="brand">{cmds.length}</Badge>
              </div>
              <div className="space-y-3">
                {cmds.map((c) => (
                  <div key={c.name}>
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-ink">/{c.name}</code>
                    <p className="mt-1 text-xs text-ink-muted">{c.description}</p>
                    {c.subcommands.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.subcommands.map((s) => (
                          <span
                            key={s.name}
                            title={s.description}
                            className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-ink-faint"
                          >
                            /{c.name} {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-8 text-center text-sm text-ink-faint">No commands match “{q}”.</GlassCard>
      )}
    </PageTransition>
  );
}
