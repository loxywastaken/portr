import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DailyPoint } from '@/types';

export interface LeaderEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  messages: number;
  rank: number;
  lastMessageAt: string | null;
}

export interface UserStatsData {
  totals: { totalMessages: number; trackedMembers: number };
  daily: DailyPoint[];
  leaderboard: LeaderEntry[];
}

/** Message-activity stats for a guild: totals, 14-day trend and leaderboard. */
export function useUserStats(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'userstats'],
    queryFn: async () => (await api.get<UserStatsData>(`/guilds/${guildId}/userstats`)).data,
    enabled: Boolean(guildId),
    refetchInterval: 60_000,
  });
}
