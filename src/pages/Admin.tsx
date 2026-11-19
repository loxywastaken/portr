import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Crown, Plus, Search } from 'lucide-react';
import { api, extractApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppHeader } from '@/components/layout/AppHeader';
import { cn, formatDuration, formatNumber, formatRelativeTime, initialsOf } from '@/lib/utils';

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

const getData = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

type Tab = 'overview' | 'premium' | 'servers' | 'users';

/* ------------------------------------------------------------------- page -- */

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

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

  // Owner gate, after all hooks so hook order stays stable.
  if (user && !user.isOwner) return <Navigate to="/servers" replace />;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'premium', label: 'Premium', count: premium.data?.length },
    { id: 'servers', label: 'Servers', count: guilds.data?.length },
    { id: 'users', label: 'Users', count: users.data?.length },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader>
        <Link to="/servers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Servers
          </Button>
        </Link>
      </AppHeader>

      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
            <Badge>Owner only</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">Bot health, premium access and every server Nexus runs in.</p>

          <nav className="mt-6 flex gap-1 overflow-x-auto border-b [scrollbar-width:none]">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
                  tab === t.id
                    ? 'border-white font-medium text-white'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
                {t.count !== undefined && <span className="text-xs text-ink-faint">{t.count}</span>}
              </button>
            ))}
          </nav>

          <div className="mt-6">
            {tab === 'overview' && <OverviewTab data={overview.data} loading={overview.isLoading} />}
            {tab === 'premium' && <PremiumTab records={premium.data} loading={premium.isLoading} />}
            {tab === 'servers' && <ServersTab guilds={guilds.data} loading={guilds.isLoading} />}
            {tab === 'users' && <UsersTab users={users.data} loading={users.isLoading} />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- overview -- */

function OverviewTab({ data, loading }: { data?: AdminOverview; loading: boolean }) {
  const t = data?.totals;
  const usage: [string, ReactNode][] = [
    ['Servers', t && formatNumber(t.servers)],
    ['Members', t && formatNumber(t.members)],
    ['Commands run', t && formatNumber(t.commands)],
    ['Registered users', t && formatNumber(t.registeredUsers)],
    ['Active premium', t && `${formatNumber(t.premiumActive)} of ${formatNumber(t.premiumTotal)}`],
    ['Custom commands', t && formatNumber(t.customCommands)],
  ];
  const health: [string, ReactNode][] = [
    [
      'Status',
      data && (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', data.bot.ready ? 'bg-emerald-400' : 'bg-red-400')} />
          {data.bot.ready ? 'Online' : 'Not ready'}
        </span>
      ),
    ],
    ['Gateway ping', data && `${data.bot.ping} ms`],
    ['Uptime', data && formatDuration(data.bot.uptimeMs)],
    ['Memory', data && `${data.system.memory.rssMb} MB`],
    ['CPU', data && `${data.system.cpu.usagePercent}%`],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Section title="Usage" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-white/[0.08] sm:grid-cols-3">
          {usage.map(([label, value]) => (
            <div key={label} className="bg-surface-soft p-5">
              <div className="text-xs text-ink-muted">{label}</div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-20" />
              ) : (
                <div className="mt-1 text-2xl font-semibold tracking-tight">{value ?? '—'}</div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Bot health">
        <GlassCard className="divide-y">
          {health.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-ink-muted">{label}</span>
              {loading ? <Skeleton className="h-4 w-16" /> : <span className="font-medium">{value ?? '—'}</span>}
            </div>
          ))}
        </GlassCard>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------- premium -- */

function PremiumTab({ records, loading }: { records?: PremiumRecord[]; loading: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [days, setDays] = useState('0');

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin'] });

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
    <div className="space-y-6">
      <Section title="Grant premium">
        <GlassCard className="p-5">
          <form onSubmit={onGrant} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs text-ink-muted">Discord user ID</span>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 427799772359819264"
                inputMode="numeric"
              />
            </label>
            <label className="w-full sm:w-44">
              <span className="mb-1.5 block text-xs text-ink-muted">Days (0 = lifetime)</span>
              <Input
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                inputMode="numeric"
              />
            </label>
            <Button type="submit" loading={grant.isPending}>
              <Plus className="h-4 w-4" /> Grant
            </Button>
          </form>
          <p className="mt-3 text-xs text-ink-faint">
            In Discord, turn on Developer Mode, then right-click a user → Copy User ID.
          </p>
        </GlassCard>
      </Section>

      <Section title="Premium users">
        <Table
          head={['User', 'Status', 'Custom commands', '']}
          loading={loading}
          empty={records?.length === 0 ? 'No premium users yet.' : undefined}
        >
          {records?.map((p) => (
            <tr key={p.userId}>
              <td>
                <Person name={p.username} avatar={p.avatar} sub={p.userId} />
              </td>
              <td>
                {p.lifetime ? (
                  <Badge variant="warning">
                    <Crown className="h-3 w-3" /> Lifetime
                  </Badge>
                ) : p.active ? (
                  <Badge variant="success">Expires {formatRelativeTime(p.expiresAt)}</Badge>
                ) : (
                  <Badge variant="danger">Expired</Badge>
                )}
              </td>
              <td className="text-ink-muted">{p.customCommands}</td>
              <td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  loading={revoke.isPending && revoke.variables === p.userId}
                  onClick={() => revoke.mutate(p.userId)}
                >
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------- servers -- */

function ServersTab({ guilds, loading }: { guilds?: AdminGuild[]; loading: boolean }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(guilds ?? [])]
      .filter((g) => !term || g.name.toLowerCase().includes(term) || g.id.includes(term))
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [guilds, q]);

  return (
    <Section
      title="Servers"
      action={
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search servers" className="h-9 pl-9" />
        </div>
      }
    >
      <Table
        head={['Server', 'Members', 'Joined', 'Server ID']}
        loading={loading}
        empty={rows.length === 0 && !loading ? 'No servers match.' : undefined}
      >
        {rows.map((g) => (
          <tr key={g.id}>
            <td>
              <Person name={g.name} avatar={g.icon} square />
            </td>
            <td>{formatNumber(g.memberCount)}</td>
            <td className="text-ink-muted">{g.joinedAt ? formatRelativeTime(g.joinedAt) : '—'}</td>
            <td className="font-mono text-xs text-ink-faint">{g.id}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* ---------------------------------------------------------------- users -- */

function UsersTab({ users, loading }: { users?: AdminUser[]; loading: boolean }) {
  return (
    <Section title="Recent logins">
      <Table
        head={['User', 'Plan', 'Last seen', 'User ID']}
        loading={loading}
        empty={users?.length === 0 ? 'No users yet.' : undefined}
      >
        {users?.map((u) => (
          <tr key={u.discordId}>
            <td>
              <Person name={u.globalName || u.username} avatar={u.avatar} sub={u.globalName ? u.username : undefined} />
            </td>
            <td>
              {u.premium ? (
                <Badge variant="warning">
                  <Crown className="h-3 w-3" /> Premium
                </Badge>
              ) : (
                <span className="text-ink-faint">Free</span>
              )}
            </td>
            <td className="text-ink-muted">{u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : '—'}</td>
            <td className="font-mono text-xs text-ink-faint">{u.discordId}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* ------------------------------------------------------------- building -- */

function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({
  head,
  loading,
  empty,
  children,
}: {
  head: string[];
  loading: boolean;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <GlassCard className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-5 [&_td]:py-3 [&_th]:px-5 [&_th]:py-2.5 [&_tr]:border-b last:[&_tbody_tr]:border-0">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap text-xs font-medium text-ink-faint">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={head.length}>
                    <Skeleton className="h-5 w-48" />
                  </td>
                </tr>
              ))
            : children}
          {!loading && empty && (
            <tr>
              <td colSpan={head.length} className="py-10 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </GlassCard>
  );
}

function Person({
  name,
  avatar,
  sub,
  square,
}: {
  name: string;
  avatar: string | null;
  sub?: string;
  square?: boolean;
}) {
  const shape = square ? 'rounded-lg' : 'rounded-full';
  return (
    <div className="flex min-w-[12rem] items-center gap-3">
      {avatar ? (
        <img src={avatar} alt="" className={cn('h-8 w-8 shrink-0', shape)} />
      ) : (
        <div className={cn('grid h-8 w-8 shrink-0 place-items-center bg-white/10 text-xs font-semibold', shape)}>
          {initialsOf(name)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        {sub && <div className="truncate text-xs text-ink-faint">{sub}</div>}
      </div>
    </div>
  );
}
