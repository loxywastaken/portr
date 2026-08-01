import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Current autorole for a guild (null = disabled). */
export function useAutorole(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'autorole'],
    queryFn: async () => {
      const { data } = await api.get<{ autoRoleId: string | null }>(`/guilds/${guildId}/autorole`);
      return data.autoRoleId;
    },
    enabled: Boolean(guildId),
  });
}

export function useSetAutorole(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string | null) => {
      const { data } = await api.put<{ autoRoleId: string | null }>(`/guilds/${guildId}/autorole`, { roleId });
      return data.autoRoleId;
    },
    onSuccess: (autoRoleId) => {
      queryClient.setQueryData(['guild', guildId, 'autorole'], autoRoleId);
    },
  });
}

export interface ReactionRolePayload {
  channelId: string;
  title?: string;
  description?: string;
  roleIds: string[];
}

export function usePostReactionRoles(guildId: string) {
  return useMutation({
    mutationFn: async (body: ReactionRolePayload) => {
      const { data } = await api.post<{ ok: boolean }>(`/guilds/${guildId}/reactionroles`, body);
      return data;
    },
  });
}
