import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Giveaway {
  id: string;
  channelId: string;
  messageId: string;
  prize: string;
  winnerCount: number;
  endsAt: string;
  hostId: string;
  ended: boolean;
  entrantCount: number;
  winners: string[];
}

export interface GiveawayInput {
  channelId: string;
  prize: string;
  winnerCount: number;
  durationMs: number;
}

export function useGiveaways(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'giveaways'],
    queryFn: async () => {
      const { data } = await api.get<{ giveaways: Giveaway[] }>(`/guilds/${guildId}/giveaways`);
      return data.giveaways;
    },
    enabled: Boolean(guildId),
    refetchInterval: 30_000,
  });
}

export function useCreateGiveaway(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GiveawayInput) => (await api.post(`/guilds/${guildId}/giveaways`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'giveaways'] }),
  });
}

export function useEndGiveaway(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/guilds/${guildId}/giveaways/${id}/end`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'giveaways'] }),
  });
}

export function useRerollGiveaway(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/guilds/${guildId}/giveaways/${id}/reroll`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'giveaways'] }),
  });
}
