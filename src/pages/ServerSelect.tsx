import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Crown, LogOut, Plus, ServerCrash } from 'lucide-react';
import { useGuilds } from '@/hooks/useGuilds';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { initialsOf } from '@/lib/utils';
import type { ManageableGuild } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function GuildTile({ guild, index }: { guild: ManageableGuild; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard className="flex h-full flex-col p-5 transition-colors duration-300 hover:border-brand-500/30">
        <div className="flex items-center gap-3">
          {guild.icon ? (
            <img src={guild.icon} alt="" className="h-12 w-12 rounded-xl" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-sm font-semibold">
              {initialsOf(guild.name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold">{guild.name}</div>
            {guild.owner && (
              <Badge variant="warning" className="mt-1">
                <Crown className="h-3 w-3" /> Owner
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-5">
          {guild.botPresent ? (
            <Link to={`/dashboard/${guild.id}`}>
              <Button className="w-full">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = `${API_URL}/api/auth/invite?guild=${guild.id}`;
              }}
            >
              <Plus className="h-4 w-4" /> Add NexusBot
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function ServerSelect() {
  const { data: guilds, isLoading, isError } = useGuilds();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="brand-gradient grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white shadow-glow">
            N
          </div>
          <span className="text-lg font-semibold tracking-tight">NexusBot</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>

      <div className="mt-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Hey {user?.globalName ?? user?.username} 👋
        </h1>
        <p className="mt-2 text-ink-muted">Pick a server to manage, or add NexusBot to a new one.</p>
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GlassCard key={i} className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="mt-5 h-10 w-full rounded-xl" />
              </GlassCard>
            ))}
          </div>
        )}

        {isError && (
          <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
            <ServerCrash className="h-8 w-8 text-ink-faint" />
            <p className="text-ink-muted">
              We couldn&apos;t load your servers. Please refresh and try again.
            </p>
          </GlassCard>
        )}

        {!isLoading && !isError && guilds && guilds.length === 0 && (
          <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-ink-muted">
              You don&apos;t manage any servers yet. Create one on Discord, then come back.
            </p>
          </GlassCard>
        )}

        {!isLoading && !isError && guilds && guilds.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((guild, index) => (
              <GuildTile key={guild.id} guild={guild} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
