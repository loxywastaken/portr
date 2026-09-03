import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LoggingSettings } from '@/types';

export function useLogging(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'logging'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: LoggingSettings }>(
        `/guilds/${guildId}/logging`,
      );
      return data.settings;
    },
    enabled: Boolean(guildId),
  });
}

export function useUpdateLogging(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LoggingSettings>) => {
      const { data } = await api.patch<{ settings: LoggingSettings }>(
        `/guilds/${guildId}/logging`,
        patch,
      );
      return data.settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['guild', guildId, 'logging'], settings);
    },
  });
}
