import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useSocketStatus } from '@/hooks/useStats';
import { cn, formatNumber, initialsOf, userAvatarUrl } from '@/lib/utils';
import type { GuildOverview } from '@/types';

interface TopbarProps {
  overview?: GuildOverview;
  onMenu: () => void;
}

export function Topbar({ overview, onMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const connected = useSocketStatus();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-surface/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {overview ? (
          <div className="flex min-w-0 items-center gap-2.5">
            {overview.icon ? (
              <img src={overview.icon} className="h-8 w-8 rounded-lg" alt="" />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-xs font-semibold">
                {initialsOf(overview.name)}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{overview.name}</div>
              <div className="text-xs text-ink-faint">
                {formatNumber(overview.memberCount)} members
              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="h-8 w-40" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
          <span
            className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-ink-faint')}
          />
          {connected ? 'Live' : 'Offline'}
        </span>

        {user && (
          <div className="flex items-center gap-2">
            <img src={userAvatarUrl(user)} className="h-8 w-8 rounded-full" alt="" />
            <span className="hidden text-sm sm:block">{user.globalName ?? user.username}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Log out"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
