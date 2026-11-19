import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import { userAvatarUrl } from '@/lib/utils';

/** Top bar shared by the full-width pages outside a server dashboard (server list, admin). */
export function AppHeader({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b bg-surface">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link to="/servers" className="flex items-center gap-2.5">
          <Logo className="h-6 w-auto text-white" />
          <span className="font-semibold tracking-tight">Nexus Service</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/updates">
            <Button variant="ghost" size="sm">
              Updates
            </Button>
          </Link>
          {children}
          {user && (
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <img src={userAvatarUrl(user)} className="h-7 w-7 rounded-full" alt="" />
              <span className="text-sm text-ink-muted">{user.globalName ?? user.username}</span>
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
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
