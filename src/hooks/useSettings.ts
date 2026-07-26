import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface GeneralSettings {
  prefix: string;
  language: string;
  embedColor: string;
  name?: string;
  icon?: string | null;
}

export function useSettings(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'settings'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: GeneralSettings }>(`/guilds/${guildId}/settings`);
      return data.settings;
    },
    enabled: Boolean(guildId),
  });
}

export function useUpdateSettings(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<GeneralSettings>) => {
      const { data } = await api.patch<{ settings: GeneralSettings }>(
        `/guilds/${guildId}/settings`,
        patch,
      );
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'overview'] });
    },
  });
}
