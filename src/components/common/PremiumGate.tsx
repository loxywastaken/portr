import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Small "Premium" tag for settings and headings. */
export function PremiumTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-amber-400/30 px-1.5 py-px text-[11px] font-medium text-amber-300',
        className,
      )}
    >
      <Crown className="h-3 w-3" /> Premium
    </span>
  );
}

/**
 * Wraps premium-only controls. When the server isn't premium the controls are
 * dimmed and disabled, with a link to the Premium page.
 */
export function PremiumGate({ premium, children, note }: { premium: boolean; children: ReactNode; note?: string }) {
  const { guildId } = useParams();
  if (premium) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Link
          to={`/dashboard/${guildId}/premium`}
          className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-surface px-3 py-2 text-sm text-amber-200 transition-colors hover:bg-surface-raised"
        >
          <Crown className="h-4 w-4" /> {note ?? 'Unlock with Premium'}
        </Link>
      </div>
    </div>
  );
}
