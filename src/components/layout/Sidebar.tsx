import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Gavel,
  Gift,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
  Trophy,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';

interface SidebarProps {
  guildId: string;
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function Sidebar({ guildId, mobileOpen, onClose }: SidebarProps) {
  const base = `/dashboard/${guildId}`;
  const items: NavItem[] = [
    { to: base, label: 'Overview', icon: LayoutDashboard, end: true },
    { to: `${base}/welcome`, label: 'Welcome', icon: UserPlus },
    { to: `${base}/server`, label: 'Server', icon: Shield },
    { to: `${base}/applications`, label: 'Applications', icon: ClipboardList },
    { to: `${base}/tickets`, label: 'Tickets', icon: Ticket },
    { to: `${base}/giveaways`, label: 'Giveaways', icon: Gift },
    { to: `${base}/templates`, label: 'Templates', icon: LayoutTemplate },
    { to: `${base}/socials`, label: 'Social Posts', icon: Megaphone },
    { to: `${base}/stats`, label: 'User Stats', icon: Trophy },
    { to: `${base}/moderation`, label: 'Moderation', icon: Gavel },
    { to: `${base}/automod`, label: 'Auto Mod', icon: ShieldCheck },
    { to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { to: `${base}/commands`, label: 'Commands', icon: BookOpen },
    { to: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed z-40 flex h-screen w-64 flex-col border-r border-white/[0.08] bg-surface-soft/95 backdrop-blur-xl transition-transform duration-300',
          'lg:sticky lg:top-0 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-400/20">
            <Logo className="h-6 w-auto text-brand-200" />
          </div>
          <div className="leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">Nexus Service</span>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">Control center</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                  isActive
                    ? 'bg-brand-500/15 text-brand-100 ring-1 ring-inset ring-brand-400/20'
                    : 'text-ink-muted hover:bg-white/[0.05] hover:text-ink',
                )
              }
            >
              <item.icon className="h-[17px] w-[17px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            to="/servers"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted transition hover:bg-white/5 hover:text-ink"
          >
            <ArrowLeftRight className="h-[18px] w-[18px]" />
            Switch server
          </Link>
        </div>
      </aside>
    </>
  );
}
