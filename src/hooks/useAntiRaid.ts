import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface JoinRaidConfig {
  enabled: boolean;
  joinThreshold: number;
  timeWindow: number;
  minAccountAge: number;
  noAvatarScore: number;
  newAccountScore: number;
  joinBurstScore: number;
  scoreLimit: number;
  action: 'kick' | 'ban' | 'timeout';
  actionDuration: number;
  autoLockdown: boolean;
  lockdownDuration: number;
  alertChannelId: string | null;
  alertRoleId: string | null;
}
export interface AntiNukeConfig {
  enabled: boolean;
  banLimit: number;
  kickLimit: number;
  channelDeleteLimit: number;
  roleDeleteLimit: number;
  webhookCreateLimit: number;
  timeWindow: number;
  action: 'stripRoles' | 'ban' | 'kick';
  alertChannelId: string | null;
  alertRoleId: string | null;
  whitelistedUsers: string[];
  whitelistedRoles: string[];
}
export interface AntiSpamConfig {
  enabled: boolean;
  messageLimit: number;
  timeWindow: number;
  duplicateLimit: number;
  mentionLimit: number;
  massMentionLimit: number;
  action: 'timeout' | 'kick' | 'ban' | 'delete';
  actionDuration: number;
  whitelistedChannels: string[];
  whitelistedRoles: string[];
}
export interface AntiRaidConfig {
  joinRaid: JoinRaidConfig;
  antiNuke: AntiNukeConfig;
  antiSpam: AntiSpamConfig;
}
export type ModuleKey = keyof AntiRaidConfig;
export const modulePaths: Record<ModuleKey, string> = {
  joinRaid: 'join-raid',
  antiNuke: 'anti-nuke',
  antiSpam: 'anti-spam',
};
export interface AntiRaidStatus {
  joinRaid: { enabled: boolean; raidModeActive: boolean };
  antiNuke: { enabled: boolean };
  antiSpam: { enabled: boolean };
  lockdownActive: boolean;
  lockdownExpiresAt: string | null;
}
export function useAntiRaid(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'antiraid', 'config'],
    queryFn: async () =>
      (await api.get<{ config: AntiRaidConfig }>(`/guilds/${guildId}/antiraid/config`)).data.config,
    enabled: Boolean(guildId),
    refetchOnWindowFocus: false,
  });
}
export function useAntiRaidStatus(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'antiraid', 'status'],
    queryFn: async () =>
      (await api.get<{ status: AntiRaidStatus }>(`/guilds/${guildId}/antiraid/status`)).data.status,
    enabled: Boolean(guildId),
    refetchInterval: 15000,
  });
}
export function useSaveAntiRaid<K extends ModuleKey>(guildId: string, module: K) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AntiRaidConfig[K]>) =>
      (
        await api.patch<{ config: AntiRaidConfig }>(
          `/guilds/${guildId}/antiraid/${modulePaths[module]}`,
          patch,
        )
      ).data.config,
    onSuccess: (config) => {
      client.setQueryData(['guild', guildId, 'antiraid', 'config'], config);
      void client.invalidateQueries({ queryKey: ['guild', guildId, 'antiraid', 'status'] });
    },
  });
}
export function useAntiRaidLockdown(guildId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      duration,
    }: {
      action: 'lockdown' | 'unlock';
      duration?: number;
    }) =>
      (
        await api.post<{ locked?: number; unlocked?: number; failed: number }>(
          `/guilds/${guildId}/antiraid/${action}`,
          action === 'lockdown' ? { duration } : {},
        )
      ).data,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['guild', guildId, 'antiraid', 'status'] }),
  });
}
