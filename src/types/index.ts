export interface AuthUser {
  _id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  email: string | null;
  isOwner: boolean;
  lastLoginAt: string;
}

export interface ManageableGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botPresent: boolean;
}

export interface WelcomeSettings {
  enabled: boolean;
  channelId: string | null;
  message: string;
  useEmbed: boolean;
  embedColor: string;
  title: string;
  imageUrl: string | null;
  mentionUser: boolean;
}

export interface ModerationSettings {
  logChannelId: string | null;
  dmOnAction: boolean;
  muteRoleId: string | null;
}

export interface GuildSettings {
  guildId: string;
  name: string;
  icon: string | null;
  prefix: string;
  language: string;
  embedColor: string;
  welcome: WelcomeSettings;
  moderation: ModerationSettings;
}

export interface GuildOverview {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  onlineCount: number | null;
  channelCount: number;
  roleCount: number;
  createdTimestamp: number;
  settings: GuildSettings;
}

export interface ChannelSummary {
  id: string;
  name: string;
  type: 'text';
}

export interface RoleSummary {
  id: string;
  name: string;
  color: string;
  position: number;
}

export type ModerationActionType =
  | 'ban'
  | 'unban'
  | 'kick'
  | 'timeout'
  | 'warn'
  | 'clear'
  | 'slowmode'
  | 'lock'
  | 'unlock';

export interface ModerationCase {
  _id: string;
  guildId: string;
  caseNumber: number;
  action: ModerationActionType;
  targetId: string | null;
  targetTag: string | null;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SystemStats {
  bot: { ready: boolean; ping: number; guilds: number; users: number; uptimeMs: number };
  system: {
    uptimeSeconds: number;
    node: string;
    platform: string;
    cpu: { cores: number; loadAvg: number; usagePercent: number };
    memory: {
      rssMb: number;
      heapUsedMb: number;
      systemTotalMb: number;
      systemUsedPercent: number;
    };
  };
  database: { state: string; ok: boolean; host: string | null; name: string | null };
  commands: { total: number; breakdown: CommandStat[] };
  timestamp: number;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface CommandStat {
  name: string;
  count: number;
}

export interface ActionStat {
  action: ModerationActionType;
  count: number;
}

export interface Analytics {
  commandsDaily: DailyPoint[];
  commandBreakdown: CommandStat[];
  moderationDaily: DailyPoint[];
  moderationBreakdown: ActionStat[];
  totals: {
    members: number;
    online: number | null;
    moderationCases: number;
    commands: number;
  };
}
