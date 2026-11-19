import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* Hooks for Settings, Premium, Leveling, Role menus, Activity and Logs. */

/* ---------------------------------------------------------------- config -- */

export interface ServerConfig {
  general: { prefix: string; language: string; embedColor: string; autoRoleId: string | null };
  moderation: { logChannelId: string | null; dmOnAction: boolean; muteRoleId: string | null };
  logging: { messageLogChannelId: string | null; memberLogChannelId: string | null; joinLeaveChannelId: string | null };
  branding: { nickname: string | null; footerText: string | null };
  premium: boolean;
}

export type ConfigPatch = { [K in Exclude<keyof ServerConfig, 'premium'>]?: Partial<ServerConfig[K]> };

export function useConfig(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'config'],
    queryFn: async () => (await api.get<{ config: ServerConfig }>(`/guilds/${guildId}/config`)).data.config,
    enabled: Boolean(guildId),
  });
}

export function useUpdateConfig(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ConfigPatch) =>
      (await api.patch<{ config: ServerConfig }>(`/guilds/${guildId}/config`, patch)).data.config,
    onSuccess: (config) => {
      qc.setQueryData(['guild', guildId, 'config'], config);
      void qc.invalidateQueries({ queryKey: ['guild', guildId, 'overview'] });
    },
  });
}

/* --------------------------------------------------------------- premium -- */

export interface PremiumStatus {
  serverPremium: boolean;
  activatedBy: string | null;
  activatedByName: string | null;
  activatedAt: string | null;
  activatedByYou: boolean;
  userPremium: boolean;
  slotsUsed: number;
  slotsMax: number;
}

export function usePremium(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'premium'],
    queryFn: async () => (await api.get<PremiumStatus>(`/guilds/${guildId}/premium`)).data,
    enabled: Boolean(guildId),
  });
}

export function useSetPremium(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) =>
      (await api.post<PremiumStatus>(`/guilds/${guildId}/premium/${on ? 'activate' : 'deactivate'}`)).data,
    onSuccess: (status) => {
      qc.setQueryData(['guild', guildId, 'premium'], status);
      // Every premium-gated page reads the flag, so refresh them all.
      void qc.invalidateQueries({ queryKey: ['guild', guildId] });
    },
  });
}

/* -------------------------------------------------------------- leveling -- */

export interface Multiplier {
  id: string;
  multiplier: number;
}

export interface LevelingSettings {
  enabled: boolean;
  announce: boolean;
  announceChannelId: string | null;
  levelUpMessage: string;
  cooldownSeconds: number;
  minXp: number;
  maxXp: number;
  stackRoles: boolean;
  roles: { level: number; roleId: string }[];
  ignoredChannelIds: string[];
  noXpRoleIds: string[];
  roleMultipliers: Multiplier[];
  channelMultipliers: Multiplier[];
  voiceXpEnabled: boolean;
  voiceXpPerMinute: number;
  levelUpImageUrl: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
}

interface LevelingResponse {
  settings: LevelingSettings;
  premium: boolean;
  maxRewards: number;
  leaderboard?: LeaderboardRow[];
}

export function useLeveling(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'leveling'],
    queryFn: async () => (await api.get<LevelingResponse>(`/guilds/${guildId}/leveling`)).data,
    enabled: Boolean(guildId),
  });
}

export function useUpdateLeveling(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LevelingSettings>) =>
      (await api.patch<LevelingResponse>(`/guilds/${guildId}/leveling`, patch)).data,
    onSuccess: (data) => {
      qc.setQueryData<LevelingResponse>(['guild', guildId, 'leveling'], (old) => ({ ...old, ...data, leaderboard: old?.leaderboard }));
    },
  });
}

/* ------------------------------------------------------------ role menus -- */

export interface RoleMenuOption {
  roleId: string;
  label: string;
  emoji: string | null;
}

export interface RoleMenu {
  id: string;
  channelId: string;
  messageId: string | null;
  title: string;
  description: string;
  color: string;
  mode: 'multi' | 'single';
  options: RoleMenuOption[];
}

export type RoleMenuInput = Omit<RoleMenu, 'id' | 'messageId'>;

export function useRoleMenus(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'rolemenus'],
    queryFn: async () =>
      (
        await api.get<{ menus: RoleMenu[]; premium: boolean; maxMenus: number; maxRoles: number }>(
          `/guilds/${guildId}/rolemenus`,
        )
      ).data,
    enabled: Boolean(guildId),
  });
}

export function useSaveRoleMenu(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: RoleMenuInput & { id?: string }) =>
      id
        ? (await api.put(`/guilds/${guildId}/rolemenus/${id}`, input)).data
        : (await api.post(`/guilds/${guildId}/rolemenus`, input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['guild', guildId, 'rolemenus'] }),
  });
}

export function useDeleteRoleMenu(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/guilds/${guildId}/rolemenus/${id}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['guild', guildId, 'rolemenus'] }),
  });
}

/* -------------------------------------------------------- activity + logs -- */

export interface ActivityDay {
  date: string;
  messages: number;
  joins: number;
  leaves: number;
  commands: number;
}

export interface Activity {
  days: number;
  maxDays: number;
  premium: boolean;
  daily: ActivityDay[];
  totals: { messages: number; joins: number; leaves: number; commands: number };
  netGrowth: number;
}

export function useActivity(guildId: string, days: number) {
  return useQuery({
    queryKey: ['guild', guildId, 'insights', days],
    queryFn: async () => (await api.get<Activity>(`/guilds/${guildId}/insights`, { params: { days } })).data,
    enabled: Boolean(guildId),
    placeholderData: keepPreviousData,
  });
}

export type LogKind =
  | 'message_delete'
  | 'message_edit'
  | 'member_join'
  | 'member_leave'
  | 'member_roles'
  | 'member_nickname'
  | 'ban'
  | 'unban';

export interface LogEntry {
  id: string;
  kind: LogKind;
  userId: string | null;
  userTag: string | null;
  channelId: string | null;
  content: string | null;
  before: string | null;
  createdAt: string;
}

export function useLogs(guildId: string, params: { q: string; kind: string }, enabled: boolean) {
  return useQuery({
    queryKey: ['guild', guildId, 'logs', params],
    queryFn: async () =>
      (
        await api.get<{ entries: LogEntry[]; hasMore: boolean; retentionDays: number }>(`/guilds/${guildId}/logs`, {
          params: { q: params.q || undefined, kind: params.kind || undefined },
        })
      ).data,
    enabled: Boolean(guildId) && enabled,
    placeholderData: keepPreviousData,
  });
}
