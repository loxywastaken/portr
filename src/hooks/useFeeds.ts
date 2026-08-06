import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type FeedPlatform = 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'rss';

export interface Feed {
  id: string;
  platform: FeedPlatform;
  label: string;
  channelId: string;
  feedUrl: string;
  mentionRoleId: string | null;
  enabled: boolean;
  lastPostedAt: string | null;
}

export interface FeedInput {
  platform: FeedPlatform;
  input: string;
  channelId: string;
  label?: string;
  mentionRoleId?: string | null;
}

export function useFeeds(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'feeds'],
    queryFn: async () => (await api.get<{ feeds: Feed[] }>(`/guilds/${guildId}/feeds`)).data.feeds,
    enabled: Boolean(guildId),
  });
}

export function useCreateFeed(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeedInput) => (await api.post(`/guilds/${guildId}/feeds`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'feeds'] }),
  });
}

export function useDeleteFeed(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/guilds/${guildId}/feeds/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'feeds'] }),
  });
}
