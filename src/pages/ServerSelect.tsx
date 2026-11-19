import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Plus, ServerCrash, ShieldCheck } from 'lucide-react';
import { useGuilds } from '@/hooks/useGuilds';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { initialsOf } from '@/lib/utils';
import type { ManageableGuild } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function GuildIcon({ guild }: { guild: ManageableGuild }) {
  return guild.icon ? (
    <img src={guild.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
  ) : (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-semibold">
      {initialsOf(guild.name)}
    </div>
  );
}

function GuildRow({ guild }: { guild: ManageableGuild }) {
  const body = (
    <>
      <GuildIcon guild={guild} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{guild.name}</div>
        {guild.owner && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
            <Crown className="h-3 w-3" /> Owner
          </div>
        )}
      </div>
    </>
  );

  if (guild.botPresent) {
    return (
      <Link
        to={`/dashboard/${guild.id}`}
        className="group flex items-center gap-3 rounded-xl border bg-surface-soft p-4 transition-colors hover:border-white/20 hover:bg-surface-raised"
      >
        {body}
        <ArrowRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-white" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-surface-soft p-4">
      {body}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          window.location.href = `${API_URL}/api/auth/invite?guild=${guild.id}`;
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add bot
      </Button>
    </div>
  );
}

function Group({ title, guilds }: { title: string; guilds: ManageableGuild[] }) {
  if (guilds.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">
        {title} <span className="text-ink-faint">· {guilds.length}</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guilds.map((g) => (
          <GuildRow key={g.id} guild={g} />
        ))}
      </div>
    </section>
  );
}

export default function ServerSelect() {
  const { data: guilds, isLoading, isError } = useGuilds();
  const { user } = useAuth();

  const byName = (a: ManageableGuild, b: ManageableGuild) => a.name.localeCompare(b.name);
  const active = (guilds ?? []).filter((g) => g.botPresent).sort(byName);
  const invitable = (guilds ?? []).filter((g) => !g.botPresent).sort(byName);

  return (
    <div className="min-h-screen">
      <AppHeader>
        {user?.isOwner && (
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ShieldCheck className="h-4 w-4" /> Admin
            </Button>
          </Link>
        )}
      </AppHeader>

      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold tracking-tight">Servers</h1>
          <p className="mt-1 text-sm text-ink-muted">Pick a server to manage, or add Nexus to one you own.</p>

          <div className="mt-6 space-y-8 border-t pt-6">
            {isLoading && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border bg-surface-soft p-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
                <ServerCrash className="h-6 w-6 text-ink-faint" />
                <p className="text-sm text-ink-muted">Couldn&apos;t load your servers. Refresh to try again.</p>
              </GlassCard>
            )}

            {!isLoading && !isError && guilds?.length === 0 && (
              <GlassCard className="p-12 text-center text-sm text-ink-muted">
                You don&apos;t manage any servers yet.
              </GlassCard>
            )}

            {!isLoading && !isError && (
              <>
                <Group title="Manage" guilds={active} />
                <Group title="Add Nexus" guilds={invitable} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
