import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { DiscordIcon } from '@/components/common/DiscordIcon';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { user, loading, login } = useAuth();
  const [params] = useSearchParams();
  const hasError = params.get('error') === 'oauth';

  if (!loading && user) return <Navigate to="/servers" replace />;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <GlassCard className="w-full max-w-md animate-fade-up p-8">
        <div className="flex flex-col items-center text-center">
          <div className="brand-gradient grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white shadow-glow">
            N
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Sign in with Discord to manage your servers.
          </p>
        </div>

        {hasError && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>We couldn&apos;t complete sign-in. Please try again.</span>
          </div>
        )}

        <Button size="lg" className="mt-6 w-full" onClick={login}>
          <DiscordIcon className="h-5 w-5" /> Continue with Discord
        </Button>

        <p className="mt-4 text-center text-xs text-ink-faint">
          We only request your identity and server list — nothing is posted on your behalf.
        </p>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </GlassCard>
    </div>
  );
}
