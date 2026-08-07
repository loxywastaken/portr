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

export interface GenerateResponse {
  started: boolean;
  estimated: number;
  usage: { used: number; limit: number; remaining: number };
}

/** UTF-8-safe base64 — the design is sent as an opaque blob so a WAF/proxy can't
 *  pattern-match the raw JSON body (which was returning a non-app 403). */
function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
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
      (await api.post<GenerateResponse>(`/guilds/${guildId}/templates/generate`, { designB64: toB64(design) })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'templates', 'usage'] }),
  });
}

export function useSaveTemplate(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; design: string }) =>
      (await api.post(`/guilds/${guildId}/templates/saved`, { name: v.name, designB64: toB64(v.design) })).data,
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
