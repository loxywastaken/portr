import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';

/**
 * Joins the guild's realtime room and invalidates the relevant queries when the
 * bot pushes an event (a new moderation case, a member joining/leaving).
 */
export function useGuildRealtime(guildId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!guildId) return;
    const socket = getSocket();

    const join = () => socket.emit('guild:subscribe', guildId);
    join();
    socket.on('connect', join);

    const onCase = () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'moderation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'analytics'] });
    };
    const onMember = () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'overview'] });
    };
    // Realtime message stats — refetches only when the User Stats page is open
    // (invalidate only refetches active observers), so it's free otherwise.
    const onStatsMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'userstats'] });
    };

    socket.on('moderation:case', onCase);
    socket.on('member:join', onMember);
    socket.on('member:leave', onMember);
    socket.on('stats:message', onStatsMessage);

    return () => {
      socket.emit('guild:unsubscribe', guildId);
      socket.off('connect', join);
      socket.off('moderation:case', onCase);
      socket.off('member:join', onMember);
      socket.off('member:leave', onMember);
      socket.off('stats:message', onStatsMessage);
    };
  }, [guildId, queryClient]);
}
