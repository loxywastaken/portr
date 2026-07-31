import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Clock,
  Command as CommandIcon,
  Crown,
  Gauge,
  LogOut,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { api, extractApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Logo } from '@/components/common/Logo';
import { formatDuration, formatNumber, formatRelativeTime, initialsOf } from '@/lib/utils';

/* ------------------------------------------------------------------ types -- */

interface AdminOverview {
  totals: {
    servers: number;
    members: number;
    commands: number;
    premiumActive: number;
    premiumTotal: number;
    customCommands: number;
    registeredUsers: number;
  };
  bot: { ready: boolean; ping: number; guilds: number; users: number; uptimeMs: number };
  system: {
    uptimeSeconds: number;
    memory: { rssMb: number; systemUsedPercent: number };
    cpu: { usagePercent: number };
  };
}

interface PremiumRecord {
  userId: string;
  username: string;
  avatar: string | null;
  expiresAt: string;
  lifetime: boolean;
  active: boolean;
  grantedBy: string | null;
  customCommands: number;
}

interface AdminGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  ownerId: string;
  joinedAt: string | null;
}

interface AdminUser {
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  lastLoginAt: string | null;
  premium: boolean;
}

/* --------------------------------------------------------------- fetchers -- */

const getData = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

/* ------------------------------------------------------------------- page -- */

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [userId, setUserId] = useState('');
  const [days, setDays] = useState('0');

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => getData<AdminOverview>('/admin/overview'),
    refetchInterval: 15_000,
  });
  const premium = useQuery({
    queryKey: ['admin', 'premium'],
    queryFn: () => getData<{ premium: PremiumRecord[] }>('/admin/premium').then((d) => d.premium),
  });
  const guilds = useQuery({
    queryKey: ['admin', 'guilds'],
    queryFn: () => getData<{ guilds: AdminGuild[] }>('/admin/guilds').then((d) => d.guilds),
  });
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getData<{ users: AdminUser[] }>('/admin/users').then((d) => d.users),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'premium'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const grant = useMutation({
    mutationFn: (body: { userId: string; days: number }) => api.post('/admin/premium', body).then((r) => r.data),
    onSuccess: () => {
      toast('Premium granted.', 'success');
      setUserId('');
      setDays('0');
      invalidate();
    },
    onError: (err) => toast(extractApiError(err).message, 'error'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/premium/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast('Premium revoked.', 'success');
      invalidate();
    },
    onError: (err) => toast(extractApiError(err).message, 'error'),
  });

  // Owner gate — non-owners are bounced back to their server list. Placed after
  // all hooks so hook order stays stable across renders (Rules of Hooks).
  if (user && !user.isOwner) return <Navigate to="/servers" replace />;

  const t = overview.data?.totals;

  const onGrant = (e: FormEvent) => {
    e.preventDefault();
    const id = userId.trim();
    if (!/^\d{15,20}$/.test(id)) {
      toast('Enter a valid Discord user ID (15–20 digits).', 'error');
      return;
    }
    grant.mutate({ userId: id, days: Number(days) || 0 });
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight">Nexus Service</span>
          <Badge variant="brand" className="ml-1">
            <ShieldCheck className="h-3 w-3" /> Admin
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/servers')}>
            <ArrowLeft className="h-4 w-4" /> Servers
          </Button>
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
      </div>

      <div className="mt-10">
        <h1 className="text-3xl font-bold tracking-tight">Admin panel</h1>
        <p className="mt-2 text-ink-muted">Manage premium, and monitor every server the bot runs in.</p>
      </div>

      {/* Stat grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="Servers" value={t ? formatNumber(t.servers) : '—'} loading={overview.isLoading} />
        <StatCard icon={Users} label="Members" value={t ? formatNumber(t.members) : '—'} loading={overview.isLoading} />
        <StatCard
          icon={CommandIcon}
          label="Commands"
          value={t ? formatNumber(t.commands) : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Crown}
          label="Active premium"
          value={t ? formatNumber(t.premiumActive) : '—'}
          hint={t ? `${t.customCommands} custom commands` : undefined}
          accent="text-amber-300"
          loading={overview.isLoading}
        />
        <StatCard
          icon={Users}
          label="Registered users"
          value={t ? formatNumber(t.registeredUsers) : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Gauge}
          label="Gateway ping"
          value={overview.data ? `${overview.data.bot.ping} ms` : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={overview.data ? formatDuration(overview.data.bot.uptimeMs) : '—'}
          loading={overview.isLoading}
        />
        <StatCard
          icon={Activity}
          label="Memory"
          value={overview.data ? `${overview.data.system.memory.rssMb} MB` : '—'}
          hint={overview.data ? `${overview.data.system.cpu.usagePercent}% CPU` : undefined}
          loading={overview.isLoading}
        />
      </div>

      {/* Premium management */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold">Premium</h2>
        </div>

        <GlassCard className="p-5">
          <form onSubmit={onGrant} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Discord user ID</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 427799772359819264"
                inputMode="numeric"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Days (0 = lifetime)</label>
              <Input
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" loading={grant.isPending} className="sm:w-auto">
              <Plus className="h-4 w-4" /> Grant
            </Button>
          </form>
          <p className="mt-2 text-xs text-ink-faint">
            Find a user&apos;s ID by enabling Developer Mode in Discord, then right-clicking them → Copy User ID.
          </p>
        </GlassCard>

        <div className="mt-4 space-y-2">
          {premium.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <GlassCard key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </GlassCard>
            ))}

          {!premium.isLoading && premium.data && premium.data.length === 0 && (
            <GlassCard className="p-8 text-center text-ink-muted">No premium users yet.</GlassCard>
          )}

          {premium.data?.map((p, i) => (
            <motion.div
              key={p.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <GlassCard className="flex flex-wrap items-center gap-3 p-4">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {initialsOf(p.username)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.username}</span>
                    {p.lifetime ? (
                      <Badge variant="warning">
                        <Crown className="h-3 w-3" /> Lifetime
                      </Badge>
                    ) : p.active ? (
                      <Badge variant="success">Expires {formatRelativeTime(p.expiresAt)}</Badge>
                    ) : (
                      <Badge variant="danger">Expired</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-faint">
                    {p.userId} · {p.customCommands} custom command{p.customCommands === 1 ? '' : 's'}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={revoke.isPending && revoke.variables === p.userId}
                  onClick={() => revoke.mutate(p.userId)}
                >
                  <Trash2 className="h-4 w-4" /> Revoke
                </Button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Servers */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-brand-300" />
          <h2 className="text-lg font-semibold">Servers</h2>
          {guilds.data && <span className="text-sm text-ink-faint">({guilds.data.length})</span>}
        </div>

        {guilds.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GlassCard key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-32" />
              </GlassCard>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.data?.map((g) => (
              <GlassCard key={g.id} className="flex items-center gap-3 p-4">
                {g.icon ? (
                  <img src={g.icon} alt="" className="h-10 w-10 rounded-xl" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-xs font-semibold">
                    {initialsOf(g.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="text-xs text-ink-faint">{formatNumber(g.memberCount)} members</div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Recent users */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-300" />
          <h2 className="text-lg font-semibold">Recent logins</h2>
        </div>

        <GlassCard className="divide-y divide-white/5">
          {users.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          {users.data?.slice(0, 12).map((u) => (
            <div key={u.discordId} className="flex items-center gap-3 p-4">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-9 w-9 rounded-full" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                  {initialsOf(u.globalName || u.username)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{u.globalName || u.username}</span>
                  {u.premium && (
                    <Badge variant="warning">
                      <Crown className="h-3 w-3" /> Premium
                    </Badge>
                  )}
                </div>
                <div className="truncate text-xs text-ink-faint">
                  {u.lastLoginAt ? `Last seen ${formatRelativeTime(u.lastLoginAt)}` : u.discordId}
                </div>
              </div>
            </div>
          ))}
          {!users.isLoading && users.data && users.data.length === 0 && (
            <div className="p-8 text-center text-ink-muted">No users yet.</div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
