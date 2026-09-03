import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CommandInfo {
  name: string;
  description: string;
  category: string;
  subcommands: { name: string; description: string }[];
}

const FALLBACK_COMMANDS: CommandInfo[] = [
  // Moderation
  { name: 'ban', description: 'Ban a member from the server.', category: 'Moderation', subcommands: [] },
  { name: 'unban', description: 'Unban a user by their ID.', category: 'Moderation', subcommands: [] },
  { name: 'massunban', description: 'Mass unban multiple users at once.', category: 'Moderation', subcommands: [
    { name: 'list', description: 'Unban from the ban list interactively.' },
    { name: 'ids', description: 'Unban a list of user IDs.' },
    { name: 'all', description: 'Unban every banned user.' },
  ] },
  { name: 'kick', description: 'Kick a member from the server.', category: 'Moderation', subcommands: [] },
  { name: 'timeout', description: 'Timeout a member for a specified duration.', category: 'Moderation', subcommands: [] },
  { name: 'untimeout', description: 'Remove a timeout from a member.', category: 'Moderation', subcommands: [] },
  { name: 'warn', description: 'Issue a warning to a member.', category: 'Moderation', subcommands: [] },
  { name: 'warnings', description: 'View warnings for a member.', category: 'Moderation', subcommands: [
    { name: 'list', description: 'List all warnings for a user.' },
    { name: 'clear', description: 'Clear all warnings for a user.' },
    { name: 'remove', description: 'Remove a specific warning by ID.' },
  ] },
  { name: 'purge', description: 'Delete multiple messages at once.', category: 'Moderation', subcommands: [
    { name: 'any', description: 'Purge the last N messages.' },
    { name: 'user', description: 'Purge messages from a specific user.' },
    { name: 'bots', description: 'Purge messages from bots only.' },
    { name: 'contains', description: 'Purge messages containing specific text.' },
  ] },
  { name: 'slowmode', description: 'Set slowmode for a channel.', category: 'Moderation', subcommands: [] },
  { name: 'lock', description: 'Lock a channel to prevent messages.', category: 'Moderation', subcommands: [] },
  { name: 'unlock', description: 'Unlock a previously locked channel.', category: 'Moderation', subcommands: [] },
  { name: 'case', description: 'View or manage a moderation case.', category: 'Moderation', subcommands: [
    { name: 'view', description: 'View details of a specific case.' },
    { name: 'reason', description: 'Update the reason for a case.' },
    { name: 'delete', description: 'Delete a moderation case.' },
  ] },
  { name: 'modstats', description: 'View moderation statistics for staff.', category: 'Moderation', subcommands: [] },

  // Utility
  { name: 'help', description: 'Show a list of all available commands.', category: 'Utility', subcommands: [] },
  { name: 'ping', description: 'Check the bot\'s latency and API response time.', category: 'Utility', subcommands: [] },
  { name: 'serverinfo', description: 'Display detailed server information.', category: 'Utility', subcommands: [] },
  { name: 'userinfo', description: 'Display information about a user.', category: 'Utility', subcommands: [] },
  { name: 'avatar', description: 'Get a user\'s avatar in full resolution.', category: 'Utility', subcommands: [
    { name: 'user', description: 'Get a user\'s global avatar.' },
    { name: 'server', description: 'Get a user\'s server-specific avatar.' },
  ] },
  { name: 'banner', description: 'Get a user\'s profile banner.', category: 'Utility', subcommands: [] },
  { name: 'roleinfo', description: 'Display information about a role.', category: 'Utility', subcommands: [] },
  { name: 'channelinfo', description: 'Display information about a channel.', category: 'Utility', subcommands: [] },
  { name: 'membercount', description: 'Show the current member count.', category: 'Utility', subcommands: [] },
  { name: 'firstmessage', description: 'Get the first message in a channel.', category: 'Utility', subcommands: [] },
  { name: 'snipe', description: 'Recover the last deleted message in a channel.', category: 'Utility', subcommands: [] },
  { name: 'editsnipe', description: 'Recover the last edited message in a channel.', category: 'Utility', subcommands: [] },
  { name: 'afk', description: 'Set your AFK status with an optional message.', category: 'Utility', subcommands: [] },
  { name: 'remind', description: 'Set a reminder for yourself.', category: 'Utility', subcommands: [] },
  { name: 'poll', description: 'Create a poll with up to 10 options.', category: 'Utility', subcommands: [] },
  { name: 'embed', description: 'Create and send a custom embed.', category: 'Utility', subcommands: [
    { name: 'create', description: 'Build a new embed interactively.' },
    { name: 'json', description: 'Send an embed from raw JSON.' },
  ] },
  { name: 'say', description: 'Make the bot send a message in a channel.', category: 'Utility', subcommands: [] },
  { name: 'steal', description: 'Steal an emoji from another server and add it here.', category: 'Utility', subcommands: [] },

  // Fun
  { name: '8ball', description: 'Ask the magic 8-ball a question.', category: 'Fun', subcommands: [] },
  { name: 'coinflip', description: 'Flip a coin — heads or tails.', category: 'Fun', subcommands: [] },
  { name: 'roll', description: 'Roll dice (e.g. 2d6, d20).', category: 'Fun', subcommands: [] },
  { name: 'meme', description: 'Get a random meme from Reddit.', category: 'Fun', subcommands: [] },
  { name: 'joke', description: 'Get a random joke.', category: 'Fun', subcommands: [] },
  { name: 'trivia', description: 'Start a trivia question.', category: 'Fun', subcommands: [] },
  { name: 'rps', description: 'Play rock-paper-scissors against the bot.', category: 'Fun', subcommands: [] },
  { name: 'howgay', description: 'The very scientific gay-meter.', category: 'Fun', subcommands: [] },
  { name: 'ship', description: 'Calculate the love compatibility between two users.', category: 'Fun', subcommands: [] },
  { name: 'rate', description: 'Let the bot rate something out of 10.', category: 'Fun', subcommands: [] },
  { name: 'choose', description: 'Let the bot choose between multiple options.', category: 'Fun', subcommands: [] },

  // Info
  { name: 'botinfo', description: 'Display information about the bot.', category: 'Info', subcommands: [] },
  { name: 'invite', description: 'Get the bot\'s invite link.', category: 'Info', subcommands: [] },
  { name: 'support', description: 'Get a link to the support server.', category: 'Info', subcommands: [] },
  { name: 'uptime', description: 'Check how long the bot has been online.', category: 'Info', subcommands: [] },
  { name: 'stats', description: 'View the bot\'s global statistics.', category: 'Info', subcommands: [] },
  { name: 'changelog', description: 'View the latest changelog and updates.', category: 'Info', subcommands: [] },
  { name: 'premium', description: 'View premium features and your subscription status.', category: 'Info', subcommands: [] },

  // Levels
  { name: 'rank', description: 'View your or another user\'s level and XP.', category: 'Levels', subcommands: [] },
  { name: 'leaderboard', description: 'View the server\'s XP leaderboard.', category: 'Levels', subcommands: [] },
  { name: 'levels', description: 'Configure the leveling system.', category: 'Levels', subcommands: [
    { name: 'enable', description: 'Enable or disable the leveling system.' },
    { name: 'channel', description: 'Set the level-up announcement channel.' },
    { name: 'rewards', description: 'Configure role rewards for reaching levels.' },
    { name: 'multiplier', description: 'Set XP multiplier for channels or roles.' },
    { name: 'reset', description: 'Reset XP for a user or the entire server.' },
  ] },

  // Tickets
  { name: 'ticket', description: 'Manage the ticket system.', category: 'Tickets', subcommands: [
    { name: 'setup', description: 'Set up the ticket system.' },
    { name: 'close', description: 'Close the current ticket.' },
    { name: 'add', description: 'Add a user to a ticket.' },
    { name: 'remove', description: 'Remove a user from a ticket.' },
    { name: 'transcript', description: 'Save a transcript of the ticket.' },
    { name: 'rename', description: 'Rename the current ticket channel.' },
  ] },

  // Giveaways
  { name: 'giveaway', description: 'Create and manage giveaways.', category: 'Giveaways', subcommands: [
    { name: 'start', description: 'Start a new giveaway.' },
    { name: 'end', description: 'End a giveaway early.' },
    { name: 'reroll', description: 'Reroll the winner of a giveaway.' },
    { name: 'list', description: 'List all active giveaways.' },
    { name: 'pause', description: 'Pause an active giveaway.' },
    { name: 'resume', description: 'Resume a paused giveaway.' },
  ] },

  // Applications
  { name: 'apply', description: 'Submit an application.', category: 'Applications', subcommands: [] },
  { name: 'application', description: 'Manage application forms.', category: 'Applications', subcommands: [
    { name: 'create', description: 'Create a new application form.' },
    { name: 'delete', description: 'Delete an application form.' },
    { name: 'list', description: 'List all application forms.' },
    { name: 'accept', description: 'Accept a submitted application.' },
    { name: 'deny', description: 'Deny a submitted application.' },
  ] },

  // Auto Mod
  { name: 'automod', description: 'Configure automatic moderation.', category: 'Auto Mod', subcommands: [
    { name: 'enable', description: 'Enable auto moderation.' },
    { name: 'disable', description: 'Disable auto moderation.' },
    { name: 'config', description: 'View current auto mod configuration.' },
    { name: 'whitelist', description: 'Add a channel or role to the whitelist.' },
  ] },

  // Config
  { name: 'settings', description: 'View or change bot settings for this server.', category: 'Config', subcommands: [
    { name: 'prefix', description: 'Change the command prefix.' },
    { name: 'language', description: 'Change the bot language.' },
    { name: 'color', description: 'Change the default embed colour.' },
  ] },
  { name: 'logging', description: 'Configure event logging channels.', category: 'Config', subcommands: [
    { name: 'modlog', description: 'Set the moderation log channel.' },
    { name: 'messagelog', description: 'Set the message log channel.' },
    { name: 'memberlog', description: 'Set the member log channel.' },
    { name: 'joinleave', description: 'Set the join/leave log channel.' },
  ] },
  { name: 'welcome', description: 'Configure the welcome message system.', category: 'Config', subcommands: [
    { name: 'channel', description: 'Set the welcome channel.' },
    { name: 'message', description: 'Set the welcome message.' },
    { name: 'test', description: 'Send a test welcome message.' },
    { name: 'toggle', description: 'Enable or disable welcome messages.' },
  ] },
  { name: 'autorole', description: 'Configure roles given to new members.', category: 'Config', subcommands: [
    { name: 'set', description: 'Set the autorole.' },
    { name: 'remove', description: 'Remove the autorole.' },
  ] },
  { name: 'reactionroles', description: 'Set up self-assign reaction roles.', category: 'Config', subcommands: [
    { name: 'create', description: 'Create a reaction role panel.' },
    { name: 'delete', description: 'Delete a reaction role panel.' },
  ] },
];

export function useCommands() {
  return useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      try {
        const res = await api.get<{ commands: CommandInfo[]; total: number }>('/commands');
        return res.data;
      } catch {
        return { commands: FALLBACK_COMMANDS, total: FALLBACK_COMMANDS.length };
      }
    },
    staleTime: 5 * 60_000,
  });
}
