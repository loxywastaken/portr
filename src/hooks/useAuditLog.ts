import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuditEntry } from '@/types';

export function useAuditLog(guildId: string, page = 1, limit = 25) {
  return useQuery({
    queryKey: ['guild', guildId, 'audit-log', page, limit],
    queryFn: async () => {
      const { data } = await api.get<{ entries: AuditEntry[]; total: number; page: number }>(
        `/guilds/${guildId}/audit-log`,
        { params: { page, limit } },
      );
      return data;
    },
    enabled: Boolean(guildId),
  });
}
