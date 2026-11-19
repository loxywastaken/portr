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
  Newspaper,
  ScrollText,
  Crown,
  History,
  Settings,
  ShieldCheck,
  Tags,
  Ticket,
  TrendingUp,
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
  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Server',
      items: [
        { to: base, label: 'Overview', icon: LayoutDashboard, end: true },
        { to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
        { to: `${base}/settings`, label: 'Settings', icon: Settings },
        { to: `${base}/premium`, label: 'Premium', icon: Crown },
      ],
    },
    {
      title: 'Community',
      items: [
        { to: `${base}/welcome`, label: 'Welcome', icon: UserPlus },
        { to: `${base}/leveling`, label: 'Leveling', icon: TrendingUp },
        { to: `${base}/rolemenus`, label: 'Role Menus', icon: Tags },
        { to: `${base}/stats`, label: 'User Stats', icon: Trophy },
        { to: `${base}/panels`, label: 'Info Panels', icon: ScrollText },
        { to: `${base}/applications`, label: 'Applications', icon: ClipboardList },
        { to: `${base}/tickets`, label: 'Tickets', icon: Ticket },
        { to: `${base}/giveaways`, label: 'Giveaways', icon: Gift },
      ],
    },
    {
      title: 'Safety',
      items: [
        { to: `${base}/moderation`, label: 'Moderation', icon: Gavel },
        { to: `${base}/automod`, label: 'Auto Mod', icon: ShieldCheck },
        { to: `${base}/logs`, label: 'Logs', icon: History },
      ],
    },
    {
      title: 'Tools',
      items: [
        { to: `${base}/templates`, label: 'Templates', icon: LayoutTemplate },
        { to: `${base}/socials`, label: 'Social Posts', icon: Megaphone },
        { to: `${base}/commands`, label: 'Commands', icon: BookOpen },
      ],
    },
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
          'fixed left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r bg-surface-soft transition-transform duration-300',
          'lg:sticky lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight">Nexus Service</span>
        </div>

        <nav className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto border-t px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">{group.title}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-white/[0.07] font-medium text-white'
                          : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink',
                      )
                    }
                  >
                    <item.icon className={cn('h-4 w-4', item.label === 'Premium' && 'text-amber-300')} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t p-3">
          <Link
            to="/updates"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
          >
            <Newspaper className="h-[18px] w-[18px]" />
            Updates
          </Link>
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
