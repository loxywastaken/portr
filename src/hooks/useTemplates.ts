import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TemplateUsage {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
  premiumLimit: number;
  sample: unknown;
}

export interface SavedTemplate {
  id: string;
  name: string;
  design: unknown;
}

export interface BuildResult {
  roles: number;
  categories: number;
  channels: number;
  warnings: string[];
}

export function useTemplateUsage(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'templates', 'usage'],
    queryFn: async () => (await api.get<TemplateUsage>(`/guilds/${guildId}/templates/usage`)).data,
    enabled: Boolean(guildId),
  });
}

export function useSavedTemplates(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'templates', 'saved'],
    queryFn: async () => (await api.get<{ templates: SavedTemplate[] }>(`/guilds/${guildId}/templates/saved`)).data.templates,
    enabled: Boolean(guildId),
  });
}

export function useGenerateTemplate(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (design: string) =>
      (await api.post<{ result: BuildResult; usage: TemplateUsage }>(`/guilds/${guildId}/templates/generate`, { design })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'templates', 'usage'] }),
  });
}

export function useSaveTemplate(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; design: string }) => (await api.post(`/guilds/${guildId}/templates/saved`, v)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'templates', 'saved'] }),
  });
}

export function useDeleteTemplate(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/guilds/${guildId}/templates/saved/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'templates', 'saved'] }),
  });
}
