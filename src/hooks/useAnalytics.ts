import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Analytics } from '@/types';

export function useAnalytics(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<Analytics>(`/guilds/${guildId}/analytics`);
      return data;
    },
    enabled: Boolean(guildId),
    refetchInterval: 30_000,
  });
}
