import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BanEntry } from '@/types';

export function useBanList(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'bans'],
    queryFn: async () => {
      const { data } = await api.get<{ bans: BanEntry[]; total: number }>(
        `/guilds/${guildId}/moderation/bans`,
      );
      return data;
    },
    enabled: Boolean(guildId),
  });
}

export function useMassUnban(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userIds: string[]; reason?: string }) => {
      const { data } = await api.post<{
        unbanned: number;
        failed: number;
        errors: { userId: string; error: string }[];
      }>(`/guilds/${guildId}/moderation/mass-unban`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'bans'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'moderation-stats'] });
    },
  });
}
