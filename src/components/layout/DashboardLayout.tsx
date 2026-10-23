import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useGuildOverview } from '@/hooks/useGuild';
import { useGuildRealtime } from '@/hooks/useGuildRealtime';
import { Skeleton } from '@/components/ui/Skeleton';

export function DashboardLayout() {
  const { guildId = '' } = useParams();
  const overview = useGuildOverview(guildId);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useGuildRealtime(guildId);

  useEffect(() => {
    if (overview.isError) navigate('/servers', { replace: true });
  }, [overview.isError, navigate]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <Sidebar guildId={guildId} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
          <Topbar overview={overview.data} onMenu={() => setMobileOpen(true)} />
          <main className="scrollbar-thin flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              {/* Tabs load lazily; keep the sidebar and top bar up while one loads. */}
              <Suspense fallback={<TabSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
