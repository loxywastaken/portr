import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AppQuestion {
  label: string;
  style: 'short' | 'paragraph';
  required: boolean;
  maxLength: number;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  questions: AppQuestion[];
  reviewChannelId: string | null;
  acceptRoleId: string | null;
  reviewerRoleId: string | null;
  pingRoleId: string | null;
  enabled: boolean;
}

export type ApplicationInput = Omit<Application, 'id'>;

export function useApplications(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'applications'],
    queryFn: async () => {
      const { data } = await api.get<{ applications: Application[] }>(`/guilds/${guildId}/applications`);
      return data.applications;
    },
    enabled: Boolean(guildId),
  });
}

export function useSaveApplication(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ApplicationInput }) => {
      if (id) return (await api.put(`/guilds/${guildId}/applications/${id}`, data)).data;
      return (await api.post(`/guilds/${guildId}/applications`, data)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'applications'] }),
  });
}

export function useDeleteApplication(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/guilds/${guildId}/applications/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'applications'] }),
  });
}

export function useSendApplicationPanel(guildId: string) {
  return useMutation({
    mutationFn: async (input: { channelId: string; title?: string; description?: string }) =>
      (await api.post(`/guilds/${guildId}/applications/panel`, input)).data,
  });
}
