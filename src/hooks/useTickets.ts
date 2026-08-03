import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TicketSettings {
  enabled: boolean;
  categoryId: string | null;
  supportRoleId: string | null;
  logChannelId: string | null;
  panelTitle: string;
  panelDescription: string;
  buttonLabel: string;
  welcomeMessage: string;
}

export interface OpenTicket {
  channelId: string;
  userId: string;
  number: number;
}

export function useTicketSettings(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'tickets'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: TicketSettings }>(`/guilds/${guildId}/tickets`);
      return data.settings;
    },
    enabled: Boolean(guildId),
  });
}

export function useOpenTickets(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'tickets', 'list'],
    queryFn: async () => {
      const { data } = await api.get<{ tickets: OpenTicket[] }>(`/guilds/${guildId}/tickets/list`);
      return data.tickets;
    },
    enabled: Boolean(guildId),
  });
}

export function useSaveTicketSettings(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: TicketSettings) => {
      const { data } = await api.put<{ settings: TicketSettings }>(`/guilds/${guildId}/tickets`, settings);
      return data.settings;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'tickets'] }),
  });
}

export function useSendTicketPanel(guildId: string) {
  return useMutation({
    mutationFn: async (channelId: string) =>
      (await api.post(`/guilds/${guildId}/tickets/panel`, { channelId })).data,
  });
}
