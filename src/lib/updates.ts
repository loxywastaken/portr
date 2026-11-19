/**
 * Every update to the Nexus site and bot, newest first. Shown on /updates.
 * To post a new update, add an entry to the top of this list.
 */

export type UpdateArea = 'Site' | 'Bot';

export interface Update {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  areas: UpdateArea[];
  changes: string[];
}

export const updates: Update[] = [
  {
    date: '2026-11-19',
    title: 'Leveling, role menus, server logs and Premium',
    areas: ['Site', 'Bot'],
    changes: [
      'New Settings page with every server-wide option in one place: general, moderation, log channels and branding.',
      'Server logs: the bot now posts deleted and edited messages, joins, leaves, role and nickname changes, and bans to your log channels.',
      'New Leveling page: XP range, cooldown, no-XP channels and roles, custom level-up message, up to 5 role rewards and a leaderboard.',
      'New Role Menus page: build, edit and remove self-assign role menus, including pick-one menus.',
      'Analytics now tracks messages, joins, leaves and net growth over time.',
      'Sidebar is grouped into Server, Community, Safety and Tools.',
      'Premium can now be turned on per server (up to 2) and adds: custom bot nickname and footer, XP multipliers, voice XP, level-up images, 25 level rewards, searchable 30-day logs, 90-day analytics and 25 role menus.',
      'New Premium page with every perk, free vs Premium, and how to buy.',
    ],
  },
  {
    date: '2026-11-19',
    title: 'Join any server from the admin panel',
    areas: ['Site', 'Bot'],
    changes: ['Owners can open an invite to any server Nexus is in from the admin Servers tab, to step in and moderate.'],
  },
  {
    date: '2026-11-19',
    title: 'Cleaner look and a reorganised admin panel',
    areas: ['Site'],
    changes: [
      'Flatter, simpler theme across the whole site: solid cards, no blur or glow.',
      'Server list is split into servers you manage and servers you can add Nexus to.',
      'Admin panel is now organised into Overview, Premium, Servers and Users tabs, with server search.',
      'Server list and admin page are centred on the screen.',
    ],
  },
  {
    date: '2026-11-19',
    title: 'Live stats work again',
    areas: ['Site'],
    changes: [
      'Fixed the realtime connection, so the dashboard shows "Live" and stats update on their own again.',
      'The dashboard now fills the whole window, with the sidebar on the left edge.',
      'Shorter, simpler landing page.',
    ],
  },
  {
    date: '2026-10-23',
    title: 'Info Panels',
    areas: ['Site', 'Bot'],
    changes: [
      'New Info Panels builder: generate server rules, staff rules, role info and server info from a few answers.',
      'Edit panels with a live Discord preview, then publish them as embeds with clickable role mentions.',
      'The dashboard now loads each page only when you open it, so it starts faster.',
    ],
  },
  {
    date: '2026-09-20',
    title: 'Applications without limits',
    areas: ['Site', 'Bot'],
    changes: [
      'Applications can have any number of questions.',
      'Question text is no longer length-limited.',
      'Restored the black and white button, navigation and header styles.',
    ],
  },
  {
    date: '2026-09-17',
    title: 'Dashboard refresh and better applications',
    areas: ['Site', 'Bot'],
    changes: [
      'Refreshed dashboard theme, navigation, page headers and form layouts.',
      'Applications can give several roles when accepted.',
      'More question types and easier role selection for applications.',
    ],
  },
  {
    date: '2026-09-07',
    title: 'Anti-raid protection',
    areas: ['Site', 'Bot'],
    changes: [
      'Anti-raid settings with live protection status. (Its dashboard page was hidden again on 12 September.)',
      'Fixed an Auto Mod error that stopped the dashboard from building.',
    ],
  },
  {
    date: '2026-08-12',
    title: 'Template replacing',
    areas: ['Bot'],
    changes: ['Templates can now replace an existing server setup instead of only adding to it.'],
  },
  {
    date: '2026-08-10',
    title: 'Auto Mod and command list',
    areas: ['Site', 'Bot'],
    changes: [
      'New Auto Mod page to configure automatic moderation.',
      'New Commands page listing everything the bot can do.',
    ],
  },
  {
    date: '2026-08-09',
    title: 'Video feeds',
    areas: ['Bot'],
    changes: ['Social Posts can announce new videos.'],
  },
  {
    date: '2026-08-08',
    title: 'User stats and live server stats',
    areas: ['Site', 'Bot'],
    changes: [
      'New User Stats page with message leaderboards that refresh every few seconds.',
      'Live server stats streamed to the dashboard.',
      'New nuke command for clearing out a channel.',
    ],
  },
  {
    date: '2026-08-07',
    title: 'Social Posts and template fixes',
    areas: ['Site', 'Bot'],
    changes: [
      'Clearer Social Posts setup for YouTube and RSS, with guidance for X, Instagram and TikTok feeds.',
      'Fixes for social feeds and server templates.',
    ],
  },
  {
    date: '2026-08-06',
    title: 'Templates, Social Posts and premium perks',
    areas: ['Site', 'Bot'],
    changes: [
      'New Templates page to save and reuse server setups.',
      'New Social Posts page to post new uploads from your socials into Discord.',
      'More perks for premium users.',
    ],
  },
  {
    date: '2026-08-03',
    title: 'Tickets and giveaways',
    areas: ['Site', 'Bot'],
    changes: [
      'New Tickets page: send a ticket panel and see open tickets.',
      'New Giveaways page: start, end and reroll giveaways.',
      'Pick channel categories from the dashboard.',
    ],
  },
  {
    date: '2026-08-02',
    title: 'Applications and leveling',
    areas: ['Site', 'Bot'],
    changes: ['New Applications page to build forms and post an application panel.', 'Leveling system for members.'],
  },
  {
    date: '2026-08-01',
    title: 'Server page and premium filter',
    areas: ['Site', 'Bot'],
    changes: [
      'New Server page for server-wide systems.',
      'Improved content filter, with extra options for premium.',
      'New Nexus logo favicon and "made by zxme & veer" credit.',
    ],
  },
  {
    date: '2026-07-31',
    title: 'Premium and the admin panel',
    areas: ['Site', 'Bot'],
    changes: [
      'Premium for users, including PayPal payments and custom commands.',
      'Owner-only admin panel to grant and revoke premium and see every server.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Nexus Service branding',
    areas: ['Site', 'Bot'],
    changes: ['The site is now Nexus Service, with its own logo.', 'More slash commands for the bot.'],
  },
  {
    date: '2026-07-26',
    title: 'Launch',
    areas: ['Site', 'Bot'],
    changes: [
      'First release of the Nexus bot and dashboard.',
      'Discord login, server picker, overview with live stats, welcome messages, moderation, analytics and settings.',
    ],
  },
];
