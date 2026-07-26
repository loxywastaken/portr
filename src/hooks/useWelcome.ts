import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WelcomeSettings } from '@/types';

export function useWelcome(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'welcome'],
    queryFn: async () => {
      const { data } = await api.get<{ welcome: WelcomeSettings }>(`/guilds/${guildId}/welcome`);
      return data.welcome;
    },
    enabled: Boolean(guildId),
  });
}

export function useUpdateWelcome(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WelcomeSettings>) => {
      const { data } = await api.patch<{ welcome: WelcomeSettings }>(
        `/guilds/${guildId}/welcome`,
        patch,
      );
      return data.welcome;
    },
    onSuccess: (welcome) => {
      queryClient.setQueryData(['guild', guildId, 'welcome'], welcome);
    },
  });
}
