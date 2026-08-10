import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CommandInfo {
  name: string;
  description: string;
  category: string;
  subcommands: { name: string; description: string }[];
}

/** The live slash-command catalogue (same list the bot registers). */
export function useCommands() {
  return useQuery({
    queryKey: ['commands'],
    queryFn: async () => (await api.get<{ commands: CommandInfo[]; total: number }>('/commands')).data,
    staleTime: 5 * 60_000,
  });
}
