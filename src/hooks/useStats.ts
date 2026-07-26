import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { SystemStats } from '@/types';

/**
 * Subscribes to the realtime stats stream, with an initial REST fetch so the
 * UI has data before the first socket tick arrives.
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get<SystemStats>('/stats/system')
      .then(({ data }) => {
        if (active) setStats(data);
      })
      .catch(() => undefined);

    const socket = getSocket();
    const onStats = (snapshot: SystemStats) => setStats(snapshot);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('stats:update', onStats);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    return () => {
      active = false;
      socket.off('stats:update', onStats);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { stats, connected };
}

/** Lightweight hook for just the realtime connection state. */
export function useSocketStatus(): boolean {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  return connected;
}
