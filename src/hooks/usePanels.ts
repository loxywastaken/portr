import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildMessages, type InfoPanel, type PanelKind } from '@/lib/panels';
import type { RoleSummary } from '@/types';

export type SavedPanels = Partial<Record<PanelKind, InfoPanel>>;

export interface PanelsResponse {
  panels: SavedPanels;
  /** False when the bot has not been updated with the panels API yet. */
  supported: boolean;
}

const draftKey = (guildId: string, kind: PanelKind) => `nexus.panels.${guildId}.${kind}`;

/** Local drafts survive reloads even before the bot supports saving panels. */
export function readDraft(guildId: string, kind: PanelKind): InfoPanel | null {
  try {
    const raw = localStorage.getItem(draftKey(guildId, kind));
    return raw ? (JSON.parse(raw) as InfoPanel) : null;
  } catch {
    return null;
  }
}

export function writeDraft(guildId: string, panel: InfoPanel): void {
  try {
    localStorage.setItem(draftKey(guildId, panel.kind), JSON.stringify(panel));
  } catch {
    // Storage full or blocked — the in-memory editor state still works.
  }
}

const isNotFound = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

export function usePanels(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'panels'],
    queryFn: async (): Promise<PanelsResponse> => {
      try {
        const { data } = await api.get<{ panels: SavedPanels }>(`/guilds/${guildId}/panels`);
        return { panels: data.panels ?? {}, supported: true };
      } catch (err) {
        if (isNotFound(err)) return { panels: {}, supported: false };
        throw err;
      }
    },
    enabled: Boolean(guildId),
    retry: false,
  });
}

/** Every role in the guild (not only the ones the bot can assign) — panels mention them all. */
export function useAllGuildRoles(guildId: string) {
  return useQuery({
    queryKey: ['guild', guildId, 'roles', 'all'],
    queryFn: async () => {
      const { data } = await api.get<{ roles: RoleSummary[] }>(`/guilds/${guildId}/roles`, {
        params: { all: true },
      });
      return data.roles;
    },
    enabled: Boolean(guildId),
    staleTime: 60_000,
  });
}

export function useSavePanel(guildId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (panel: InfoPanel) => {
      writeDraft(guildId, panel);
      const { data } = await api.put<{ panel: InfoPanel }>(
        `/guilds/${guildId}/panels/${panel.kind}`,
        { panel },
      );
      return data.panel;
    },
    onSuccess: (panel) =>
      queryClient.setQueryData<PanelsResponse>(['guild', guildId, 'panels'], (prev) => ({
        supported: true,
        panels: { ...(prev?.panels ?? {}), [panel.kind]: panel },
      })),
  });
}

export function usePublishPanel(guildId: string) {
  return useMutation({
    mutationFn: async (v: { panel: InfoPanel; channelId: string }) => {
      writeDraft(guildId, v.panel);
      // The dashboard builds the exact embeds, so the bot only has to send them.
      const { data } = await api.post<{ messageIds: string[] }>(
        `/guilds/${guildId}/panels/${v.panel.kind}/publish`,
        {
          channelId: v.channelId,
          panel: v.panel,
          messages: buildMessages(v.panel),
        },
      );
      return data;
    },
  });
}

export { isNotFound as isPanelsUnsupported };
