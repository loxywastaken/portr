import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ActionStat, DailyPoint, ModerationCase } from '@/types';

export type ModerationActionPayload =
  | { action: 'ban'; targetId: string; reason?: string; deleteMessageDays?: number }
  | { action: 'kick'; targetId: string; reason?: string }
  | { action: 'timeout'; targetId: string; durationMs: number; reason?: string }
  | { action: 'warn'; targetId: string; reason: string }
  | { action: 'unban'; targetId: string; reason?: string }
  | { action: 'clear'; channelId: string; amount: number }
  | { action: 'slowmode'; channelId: string; seconds: number }
  | { action: 'lock'; channelId: string; reason?: string }
  | { action: 'unlock'; channelId: string; reason?: string };

export function useModerationCases(guildId: string, limit = 25) {
  return useQuery({
    queryKey: ['guild', guildId, 'cases', limit],
    queryFn: async () => {
      const { data } = await api.get<{ cases: ModerationCase[]; total: number }>(
        `/guilds/${guildId}/moderation/cases`,
        { params: { limit } },
      );
      return data;
    },
    enabled: Boolean(guildId),
  });
}

export function useModerationStats(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'moderation-stats'],
    queryFn: async () => {
      const { data } = await api.get<{
        breakdown: ActionStat[];
        daily: DailyPoint[];
        total: number;
      }>(`/guilds/${guildId}/moderation/stats`);
      return data;
    },
    enabled: Boolean(guildId),
  });
}

export function useModerationAction(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ModerationActionPayload) => {
      const { data } = await api.post<{ case: ModerationCase }>(
        `/guilds/${guildId}/moderation/actions`,
        payload,
      );
      return data.case;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'moderation-stats'] });
    },
  });
}
