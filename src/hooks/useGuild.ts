import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ChannelSummary, GuildOverview, RoleSummary } from '@/types';

export function useGuildOverview(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'overview'],
    queryFn: async () => {
      const { data } = await api.get<GuildOverview>(`/guilds/${guildId}`);
      return data;
    },
    enabled: Boolean(guildId),
  });
}

export function useGuildChannels(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'channels'],
    queryFn: async () => {
      const { data } = await api.get<{ channels: ChannelSummary[] }>(`/guilds/${guildId}/channels`);
      return data.channels;
    },
    enabled: Boolean(guildId),
  });
}

export function useGuildRoles(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'roles'],
    queryFn: async () => {
      const { data } = await api.get<{ roles: RoleSummary[] }>(`/guilds/${guildId}/roles`);
      return data.roles;
    },
    enabled: Boolean(guildId),
  });
}
