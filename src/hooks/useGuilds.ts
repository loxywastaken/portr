import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ManageableGuild } from '@/types';

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const { data } = await api.get<{ guilds: ManageableGuild[] }>('/guilds');
      return data.guilds;
    },
  });
}
