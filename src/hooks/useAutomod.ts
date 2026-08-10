import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AutoModAction = 'delete' | 'warn' | 'timeout';

export interface AutoModRule {
  enabled: boolean;
  action: AutoModAction;
}

export interface AutoModSettings {
  enabled: boolean;
  logChannelId: string | null;
  timeoutMinutes: number;
  profanity: AutoModRule;
  links: AutoModRule;
  caps: AutoModRule & { percent: number };
  spam: AutoModRule & { messages: number; seconds: number };
  mentions: AutoModRule & { max: number };
}

export interface AutoModResponse {
  settings: AutoModSettings;
  /** Whether the bot currently has the Message Content intent (needed for the text rules). */
  contentIntent: boolean;
}

export function useAutomod(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'automod'],
    queryFn: async () => (await api.get<AutoModResponse>(`/guilds/${guildId}/automod`)).data,
    enabled: Boolean(guildId),
  });
}

export function useUpdateAutomod(guildId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AutoModSettings>) =>
      (await api.patch<AutoModResponse>(`/guilds/${guildId}/automod`, patch)).data,
    onSuccess: (data) => qc.setQueryData(['guild', guildId, 'automod'], data),
  });
}
