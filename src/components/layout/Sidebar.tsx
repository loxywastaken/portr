import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Gavel,
  LayoutDashboard,
  Settings,
  Shield,
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
    { to: `${base}/moderation`, label: 'Moderation', icon: Gavel },
    { to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
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
          'fixed z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-surface-soft/80 backdrop-blur-xl transition-transform duration-300',
          'lg:sticky lg:top-0 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight">Nexus Service</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500/15 text-white ring-1 ring-inset ring-brand-500/25'
                    : 'text-ink-muted hover:bg-white/5 hover:text-ink',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
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
