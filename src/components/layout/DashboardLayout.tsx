import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useGuildOverview } from '@/hooks/useGuild';
import { useGuildRealtime } from '@/hooks/useGuildRealtime';

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
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
