/**
 * Info panels — rules, staff rules, role information and server information.
 *
 * Everything in this file is plain, dependency-free TypeScript so the bot can
 * import (or copy) it as-is: the generator builds a panel from a few answers
 * plus the guild's roles, and `buildMessages` turns a panel into Discord
 * message payloads that respect every embed limit.
 */

export type PanelKind = 'rules' | 'staff-rules' | 'roles' | 'server-info';
export type PanelLayout = 'single' | 'sections';
export type ServerNiche = 'community' | 'gaming' | 'development' | 'creator' | 'business';
export type PanelTone = 'professional' | 'friendly' | 'strict';

export interface PanelItem {
  id: string;
  /** Role this entry describes — rendered as a clickable role mention. */
  roleId: string | null;
  /** Shown as the column heading for inline items, or bolded when there is no role. */
  label: string;
  /** One line per sub-bullet. */
  text: string;
  /** Inline items are laid out in columns (up to three per row). */
  inline: boolean;
}

export interface PanelSection {
  id: string;
  emoji: string;
  heading: string;
  /** Rendered as a block quote under the heading (e.g. "Studio Roles"). */
  subheading: string;
  /** Free markdown. Supports role (<@&id>) and channel (<#id>) mentions. */
  body: string;
  items: PanelItem[];
  /** Small print at the end of the section. */
  note: string;
}

export interface InfoPanel {
  kind: PanelKind;
  title: string;
  description: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  footer: string;
  /** single = one flowing embed (rules), sections = one embed per section (role info). */
  layout: PanelLayout;
  numbered: boolean;
  sections: PanelSection[];
}

export interface GuildRoleLike {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

export interface GeneratorInput {
  kind: PanelKind;
  serverName: string;
  tagline: string;
  niche: ServerNiche;
  tone: PanelTone;
  roles: GuildRoleLike[];
  iconUrl?: string;
}

// ── Discord embed payloads ────────────────────────────────────────────────

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
  fields?: EmbedField[];
}

export interface PanelMessage {
  embeds: Embed[];
  /** Mentions inside embeds never ping, but we still lock this down explicitly. */
  allowed_mentions: { parse: [] };
}

export const LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  fields: 25,
  footer: 2048,
  embedsPerMessage: 10,
  charsPerMessage: 6000,
} as const;

export const PANEL_KINDS: { kind: PanelKind; label: string; blurb: string }[] = [
  { kind: 'rules', label: 'Server Rules', blurb: 'Clean, numbered rules for every member.' },
  { kind: 'staff-rules', label: 'Staff Rules', blurb: 'Conduct and procedures for your team.' },
  {
    kind: 'roles',
    label: 'Role Information',
    blurb: 'Every role, what it means and how to get it.',
  },
  {
    kind: 'server-info',
    label: 'Server Information',
    blurb: 'About the server, getting started and links.',
  },
];

let counter = 0;
export function uid(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyItem(partial: Partial<PanelItem> = {}): PanelItem {
  return { id: uid(), roleId: null, label: '', text: '', inline: false, ...partial };
}

export function emptySection(partial: Partial<PanelSection> = {}): PanelSection {
  return {
    id: uid(),
    emoji: '',
    heading: 'New section',
    subheading: '',
    body: '',
    items: [],
    note: '',
    ...partial,
  };
}

export function emptyPanel(kind: PanelKind): InfoPanel {
  return {
    kind,
    title: PANEL_KINDS.find((k) => k.kind === kind)?.label ?? 'Panel',
    description: '',
    color: '#2b2d31',
    thumbnailUrl: '',
    imageUrl: '',
    footer: '',
    layout: kind === 'roles' ? 'sections' : 'single',
    numbered: kind === 'rules' || kind === 'staff-rules',
    sections: [],
  };
}

// ── Building messages ─────────────────────────────────────────────────────

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function hexToInt(hex: string): number | undefined {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return undefined;
  return parseInt(clean, 16);
}

function sectionHeading(panel: InfoPanel, section: PanelSection, index: number): string {
  const num = panel.numbered ? `**${index + 1}.** ` : '';
  const emoji = section.emoji ? `${section.emoji} ` : '';
  return `${emoji}${num}${section.heading}`.trim();
}

function itemLines(item: PanelItem): string {
  const head = item.roleId ? `<@&${item.roleId}>` : `**${item.label || 'Untitled'}**`;
  const subs = item.text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `  - ${l}`);
  return [`- ${head}`, ...subs].join('\n');
}

/** Markdown for one section, excluding inline items (those become fields). */
function sectionText(
  panel: InfoPanel,
  section: PanelSection,
  index: number,
  headingStyle: 'bold' | 'h2',
): string {
  const heading = sectionHeading(panel, section, index);
  const parts: string[] = [];
  if (heading) parts.push(headingStyle === 'h2' ? `## __${heading}__` : `### ${heading}`);
  if (section.subheading.trim()) parts.push(`> ${section.subheading.trim()}`);
  if (section.body.trim()) parts.push(section.body.trim());
  const listed = section.items.filter((i) => !i.inline || headingStyle === 'bold');
  if (listed.length) parts.push(listed.map(itemLines).join('\n'));
  // In card layout the note is a field after the columns instead.
  if (headingStyle === 'bold' && section.note.trim()) parts.push(`-# ${section.note.trim()}`);
  return parts.join('\n\n');
}

function embedSize(e: Embed): number {
  let n = (e.title?.length ?? 0) + (e.description?.length ?? 0) + (e.footer?.text.length ?? 0);
  for (const f of e.fields ?? []) n += f.name.length + f.value.length;
  return n;
}

/** Splits long text on blank lines (then single lines) so each chunk fits. */
function chunkText(text: string, max: number): string[] {
  const blocks = text.split('\n\n');
  const chunks: string[] = [];
  let current = '';
  const push = (piece: string) => {
    const joined = current ? `${current}\n\n${piece}` : piece;
    if (joined.length <= max) {
      current = joined;
      return;
    }
    if (current) chunks.push(current);
    if (piece.length <= max) {
      current = piece;
      return;
    }
    current = '';
    for (const line of piece.split('\n')) {
      const next = current ? `${current}\n${line}` : line;
      if (next.length <= max) current = next;
      else {
        if (current) chunks.push(current);
        current = clip(line, max);
      }
    }
  };
  blocks.forEach(push);
  if (current) chunks.push(current);
  return chunks;
}

/** Turns a panel into Discord messages (≤10 embeds and ≤6000 characters each). */
export function buildMessages(panel: InfoPanel): PanelMessage[] {
  const color = hexToInt(panel.color);
  const embeds: Embed[] = [];

  if (panel.layout === 'single') {
    const body = [
      panel.description.trim(),
      ...panel.sections.map((s, i) => sectionText(panel, s, i, 'bold')),
    ]
      .filter(Boolean)
      .join('\n\n');
    const chunks = chunkText(body || '​', LIMITS.description - 96);
    chunks.forEach((chunk, i) => {
      const e: Embed = { description: chunk, color };
      if (i === 0) {
        if (panel.title.trim()) e.title = clip(panel.title.trim(), LIMITS.title);
        if (panel.thumbnailUrl) e.thumbnail = { url: panel.thumbnailUrl };
      }
      embeds.push(e);
    });
  } else {
    const header: Embed = { color };
    if (panel.title.trim()) header.title = clip(panel.title.trim(), LIMITS.title);
    if (panel.description.trim())
      header.description = clip(`>>> ${panel.description.trim()}`, LIMITS.description);
    if (panel.thumbnailUrl) header.thumbnail = { url: panel.thumbnailUrl };
    if (header.title || header.description) embeds.push(header);

    panel.sections.forEach((section, index) => {
      const text = sectionText(panel, section, index, 'h2');
      const inline = section.items.filter((i) => i.inline);
      const fields: EmbedField[] = inline.map((item) => ({
        name: clip(item.label || '​', LIMITS.fieldName),
        value: clip(itemLines(item), LIMITS.fieldValue),
        inline: true,
      }));
      if (section.note.trim()) {
        fields.push({ name: '​', value: clip(`-# ${section.note.trim()}`, LIMITS.fieldValue) });
      }
      const chunks = chunkText(text || '​', LIMITS.description - 96);
      chunks.forEach((chunk, i) => {
        const e: Embed = { description: chunk, color };
        embeds.push(e);
        if (i === chunks.length - 1 && fields.length) {
          // Discord caps an embed at 25 fields; spill the rest into follow-ups.
          e.fields = fields.slice(0, LIMITS.fields);
          for (let f = LIMITS.fields; f < fields.length; f += LIMITS.fields) {
            embeds.push({ color, fields: fields.slice(f, f + LIMITS.fields) });
          }
        }
      });
    });
  }

  const last = embeds[embeds.length - 1];
  if (last) {
    if (panel.imageUrl) last.image = { url: panel.imageUrl };
    if (panel.footer.trim()) last.footer = { text: clip(panel.footer.trim(), LIMITS.footer) };
  }

  // Pack embeds into as few messages as the limits allow.
  const messages: PanelMessage[] = [];
  let batch: Embed[] = [];
  let size = 0;
  for (const e of embeds) {
    const s = embedSize(e);
    if (
      batch.length &&
      (batch.length >= LIMITS.embedsPerMessage || size + s > LIMITS.charsPerMessage)
    ) {
      messages.push({ embeds: batch, allowed_mentions: { parse: [] } });
      batch = [];
      size = 0;
    }
    batch.push(e);
    size += s;
  }
  if (batch.length) messages.push({ embeds: batch, allowed_mentions: { parse: [] } });
  return messages;
}

/** Role ids referenced anywhere in the panel. */
export function referencedRoleIds(panel: InfoPanel): string[] {
  const ids = new Set<string>();
  const scan = (s: string) => {
    for (const m of s.matchAll(/<@&(\d+)>/g)) ids.add(m[1]!);
  };
  scan(panel.description);
  for (const s of panel.sections) {
    scan(s.body);
    for (const i of s.items) if (i.roleId) ids.add(i.roleId);
  }
  return [...ids];
}

// ── Generator ─────────────────────────────────────────────────────────────

interface RuleBlock {
  emoji: string;
  heading: string;
  intro: string;
  lines: string[];
}

const TONE_INTRO: Record<PanelTone, (name: string) => string> = {
  professional: (n) =>
    `Welcome to **${n}**. By participating in this server you agree to follow the rules below.`,
  friendly: (n) =>
    `Hey, welcome to **${n}**! 💜 Please take a minute to read the rules so everyone has a great time.`,
  strict: (n) =>
    `These rules apply to every member of **${n}** without exception. Ignorance of the rules is not an excuse.`,
};

const TONE_OUTRO: Record<PanelTone, string> = {
  professional:
    'Staff may act on behavior that is not explicitly listed. Staff decisions are final.',
  friendly: 'Not sure if something is okay? Just ask a staff member — we are happy to help!',
  strict:
    'Breaking any rule may result in a warning, mute, kick or ban at staff discretion. Staff decisions are final.',
};

const CORE_RULES: RuleBlock[] = [
  {
    emoji: '📜',
    heading: 'Respect & Professionalism',
    intro: 'This server is built for a positive, welcoming community.',
    lines: [
      'Treat everyone with respect at all times.',
      'No harassment, hate speech, discrimination, or targeted insults.',
      'Debates are fine — toxicity is not.',
      'Do not publicly shame, mock, or attack other members.',
    ],
  },
  {
    emoji: '🔞',
    heading: 'Safe Content',
    intro: 'Keep every channel appropriate for all members.',
    lines: [
      'No NSFW, gore, or otherwise disturbing content — including avatars, names and statuses.',
      'No content that promotes self-harm, violence, or illegal activity.',
      'Spoiler-tag sensitive topics and respect content warnings.',
    ],
  },
  {
    emoji: '📢',
    heading: 'Spam & Advertising',
    intro: 'Keep chats readable and on-topic.',
    lines: [
      'No spam, chain messages, excessive caps, or emoji walls.',
      'Only advertise or self-promote in designated channels.',
      'No unsolicited DMs advertising servers, services or products.',
    ],
  },
  {
    emoji: '🔒',
    heading: 'Privacy & Safety',
    intro: 'Protect yourself and others.',
    lines: [
      'Never share personal information — yours or anyone else’s.',
      'No doxxing, IP grabbers, phishing links, or malicious files.',
      'Report suspicious users or links to staff immediately.',
    ],
  },
];

const NICHE_RULES: Record<ServerNiche, RuleBlock[]> = {
  community: [
    {
      emoji: '💬',
      heading: 'Channel Etiquette',
      intro: 'Every channel has a purpose.',
      lines: [
        'Use channels for their intended topic.',
        'Keep voice channels respectful — no mic spam or soundboards.',
        'Use English in public channels unless stated otherwise.',
      ],
    },
  ],
  gaming: [
    {
      emoji: '🎮',
      heading: 'Fair Play',
      intro: 'Compete hard, but play fair.',
      lines: [
        'No cheats, exploits, or sharing of hacked clients.',
        'No account selling, boosting, or trading for real money.',
        'Be a good sport — no rage-baiting or griefing in LFG.',
      ],
    },
  ],
  development: [
    {
      emoji: '🤝',
      heading: 'Networking Etiquette',
      intro: 'This is a professional development space, not a random chat server.',
      lines: [
        'Only advertise or promote in designated channels.',
        'No spam DMing members for commissions, collabs, or sales.',
        'Be clear and honest when offering services or requesting work.',
        'Respect boundaries when pitching ideas or studios.',
      ],
    },
    {
      emoji: '🚀',
      heading: 'Content & Portfolio Sharing',
      intro: 'Showcase your work — but keep it clean and relevant.',
      lines: [
        'Only post development-related content (games, UGC, builds, scripting, UI, etc.).',
        'No low-effort spam posts or repeated uploads.',
        'Do not steal, claim, or repost others’ work without credit.',
        'Always credit collaborators and original creators.',
      ],
    },
    {
      emoji: '💼',
      heading: 'Commission & Trade Safety',
      intro: 'We are a networking hub, not a middleman service.',
      lines: [
        'All deals are at your own risk.',
        'Always verify users before paying or accepting commissions.',
        'No scamming, chargebacks, or misleading offers.',
        'Use written agreements when possible for large projects.',
      ],
    },
    {
      emoji: '🧠',
      heading: 'Development Integrity',
      intro: 'Build things you can be proud of.',
      lines: [
        'No leaked, stolen, or malicious assets and scripts.',
        'No backdoors, viruses, or exploit distribution.',
        'Respect intellectual property and licenses.',
      ],
    },
  ],
  creator: [
    {
      emoji: '🎥',
      heading: 'Self-Promotion',
      intro: 'We love seeing your content — in the right place.',
      lines: [
        'Share your content only in the promotion channels.',
        'No sub-for-sub, follow-for-follow, or view botting.',
        'Collab requests go in the collab channel, not DMs.',
      ],
    },
    {
      emoji: '✨',
      heading: 'Creator Respect',
      intro: 'Support each other’s growth.',
      lines: [
        'No leaking unreleased content.',
        'Credit creators when sharing their work.',
        'Constructive feedback only.',
      ],
    },
  ],
  business: [
    {
      emoji: '💼',
      heading: 'Deals & Transactions',
      intro: 'Do business safely and transparently.',
      lines: [
        'All deals are at your own risk — verify before paying.',
        'No scams, pyramid schemes, or "get rich quick" offers.',
        'Use written agreements for anything significant.',
      ],
    },
    {
      emoji: '🧾',
      heading: 'Confidentiality',
      intro: 'Respect what is shared in trust.',
      lines: [
        'Do not leak private conversations or deals.',
        'Never share client or company data publicly.',
      ],
    },
  ],
};

const TOS_RULE: RuleBlock = {
  emoji: '⚖️',
  heading: 'Discord Terms & Guidelines',
  intro: 'Discord’s rules apply here too.',
  lines: [
    'Follow the [Discord Terms of Service](https://discord.com/terms).',
    'Follow the [Community Guidelines](https://discord.com/guidelines).',
    'You must meet Discord’s minimum age requirement.',
  ],
};

const STAFF_RULES: RuleBlock[] = [
  {
    emoji: '🛡️',
    heading: 'Conduct & Representation',
    intro: 'As staff, you represent the server at all times.',
    lines: [
      'Lead by example — follow every server rule, always.',
      'Stay calm, polite and professional, even when members are not.',
      'Never use your position to gain an advantage or settle personal disputes.',
    ],
  },
  {
    emoji: '🔐',
    heading: 'Confidentiality',
    intro: 'What happens in staff channels stays in staff channels.',
    lines: [
      'Do not leak staff discussions, logs, or member reports.',
      'Never share member data, evidence, or ticket contents publicly.',
      'Keep your account secure — enable 2FA.',
    ],
  },
  {
    emoji: '⚖️',
    heading: 'Moderation Procedure',
    intro: 'Be fair, consistent and transparent.',
    lines: [
      'Follow the punishment ladder: warn → timeout → kick → ban.',
      'Always include a clear reason and evidence when taking action.',
      'Escalate anything you are unsure about to a senior staff member.',
      'Never punish without verifying the situation first.',
    ],
  },
  {
    emoji: '🎫',
    heading: 'Tickets & Support',
    intro: 'Members come first.',
    lines: [
      'Claim tickets before working on them and close them when resolved.',
      'Respond within a reasonable time and never ignore a member.',
      'Do not handle tickets that involve you personally.',
    ],
  },
  {
    emoji: '📈',
    heading: 'Activity & Teamwork',
    intro: 'A strong team keeps the server running.',
    lines: [
      'Stay reasonably active and post an inactivity notice when away.',
      'Respect the staff hierarchy and decisions from senior staff.',
      'Raise disagreements privately, never in public channels.',
    ],
  },
  {
    emoji: '🚫',
    heading: 'Abuse of Power',
    intro: 'Permissions are a responsibility, not a reward.',
    lines: [
      'Abusing permissions results in immediate demotion.',
      'Do not mass-ping, nuke, or edit channels/roles without approval.',
      'Do not grant roles or permissions you were not authorized to.',
    ],
  },
];

type RoleCategory =
  | 'owner'
  | 'staff'
  | 'bots'
  | 'booster'
  | 'studio'
  | 'developer'
  | 'verified'
  | 'creator'
  | 'followers'
  | 'money'
  | 'level'
  | 'pings'
  | 'other';

const CATEGORY_TESTS: [RoleCategory, RegExp][] = [
  ['owner', /\b(owner|founder|co-?founder|ceo)s?\b/i],
  ['bots', /\bbots?\b/i],
  ['booster', /\b(boost(er)?s?|nitro)\b/i],
  [
    'staff',
    /\b(admin|administrator|mod|moderator|staff|helper|support|manager|trial|jr|sr|head|lead|executive|management)s?\b/i,
  ],
  ['followers', /\b(followers?|subscribers?|subs)\b/i],
  ['money', /(\$|\bbillion\w*|\bmillion\w*|\bentrepreneur\b|\binvestor\b|\brich\b)/i],
  ['creator', /\b(creator|youtuber|streamer|tiktok(er)?|celebrity|influencer|content)s?\b/i],
  ['studio', /\bstudios?\b/i],
  [
    'developer',
    /\b(dev|developer|scripter|builder|designer|modeler|animator|artist|programmer|ui|ux|vfx|sfx|composer)s?\b/i,
  ],
  ['verified', /\b(verified|member|members|citizen)\b/i],
  ['level', /\b(level|lvl|tier|rank)\s*\d*/i],
  ['pings', /\b(ping|pings|announce(ments?)?|notifications?|events?|giveaways?|updates?|news)\b/i],
];

function categorize(name: string): RoleCategory {
  if (name === '@everyone') return 'other';
  for (const [cat, re] of CATEGORY_TESTS) if (re.test(name)) return cat;
  return 'other';
}

/** Pulls "10M+", "$500K", "2.5k" style amounts out of a role name. */
function amountOf(name: string): { label: string; value: number } | null {
  const m = name.match(/\$?\s?(\d+(?:\.\d+)?)\s?([kmb])?\+?/i);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  const unit = (m[2] ?? '').toUpperCase();
  const mult = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'B' ? 1e9 : 1;
  return { label: `${m[1]}${unit}+`, value: n * mult };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanName(name: string): string {
  return name.replace(/[^\p{L}\p{N}$+.&'/\- ]/gu, '').trim() || name;
}

/** Column heading for a role — studio columns read "Do Big", not "Do Big Studios". */
function roleLabel(name: string, cat: RoleCategory): string {
  const clean = cleanName(name);
  const label = cat === 'studio' ? clean.replace(/\s*\bstudios?\b\s*/i, ' ').trim() : clean;
  return titleCase(label || clean);
}

function describeRole(role: GuildRoleLike, cat: RoleCategory, input: GeneratorInput): string {
  const name = cleanName(role.name);
  const lower = name.toLowerCase();
  const server = input.serverName;
  switch (cat) {
    case 'owner':
      return `The owners of ${server}.`;
    case 'staff':
      if (/\b(trial|jr|junior)\b/i.test(lower))
        return 'New staff members, here to help with all tasks while they learn the ropes.';
      if (/\b(head|lead|sr|senior|manager|management|executive)\b/i.test(lower))
        return 'Senior staff who oversee the team and handle escalations.';
      if (/\badmin/i.test(lower)) return 'Administrators who manage the server and its staff team.';
      if (/\bmod/i.test(lower)) return 'Moderators who keep chats safe and enforce the rules.';
      return 'Staff of this server — they help with everyday tasks and when support is needed.';
    case 'bots':
      return 'Bots within the server that help run things and give staff tools to ease management.';
    case 'booster':
      return `Only obtainable by boosting the server. Special thanks to every member who boosted ${server} and helped unlock its perks!`;
    case 'studio': {
      const studio = name.replace(/\bstudios?\b/i, '').trim() || name;
      return `Members of the server who work for **${studio}** Studios.\n**Development, Project Managing, Analytics, etc.**`;
    }
    case 'developer':
      return `Recognized ${lower.endsWith('s') ? lower : `${lower}s`} — share proof of your work with staff to request this role.`;
    case 'verified':
      return 'Given to verified members of the server.';
    case 'creator':
      if (/celebrity|influencer/i.test(lower))
        return 'Given to known and recognized members; these may include YouTubers, streamers, etc.';
      return 'Given to content creators within the community — YouTubers, Twitch streamers, TikTokers, etc.';
    case 'followers': {
      const amt = amountOf(name);
      return amt
        ? `Given to recognized members with ${amt.label} followers on any social media platform.`
        : 'Given to recognized members with a large following on any social media platform.';
    }
    case 'money': {
      if (/billion/i.test(lower))
        return 'Members who made over $1B with a company or any other source.';
      if (/entrepreneur/i.test(lower)) return 'Members who started a business.';
      if (/investor/i.test(lower)) return 'Given to known investors.';
      const amt = amountOf(name);
      return amt
        ? `Members who have made over $${amt.label.replace('+', '')} with a company or any other source.`
        : 'Members with proven earnings from a company or any other source.';
    }
    case 'level':
      return `Unlocked automatically by staying active and chatting in ${server}.`;
    case 'pings':
      return `Get pinged for ${lower.replace(/\bpings?\b/i, '').trim() || 'announcements'} — grab it from the roles channel.`;
    default:
      return input.tone === 'friendly'
        ? `A special role in ${server} ✨`
        : `Members with the ${name} role.`;
  }
}

interface RoleGroup {
  cats: RoleCategory[];
  emoji: string;
  heading: string;
  subheading: string;
  note?: string;
  columns: boolean;
}

const ROLE_GROUPS: RoleGroup[] = [
  {
    cats: ['owner', 'staff', 'bots', 'booster'],
    emoji: '',
    heading: 'Non Requestable Roles',
    subheading: '',
    columns: false,
  },
  {
    cats: ['studio'],
    emoji: '',
    heading: 'Requestable Roles',
    subheading: 'Studio Roles',
    columns: true,
  },
  {
    cats: ['developer'],
    emoji: '',
    heading: 'Requestable Roles',
    subheading: 'Development Roles',
    columns: true,
  },
  {
    cats: ['verified', 'creator'],
    emoji: '',
    heading: 'Requestable Roles',
    subheading: 'Community & Entertainment',
    columns: false,
  },
  {
    cats: ['followers'],
    emoji: '',
    heading: 'Requestable Roles',
    subheading: 'Follower Roles',
    columns: true,
  },
  {
    cats: ['money'],
    emoji: '',
    heading: 'Requestable Roles',
    subheading: 'Money Roles',
    columns: true,
  },
  {
    cats: ['level'],
    emoji: '',
    heading: 'Level Roles',
    subheading: 'Earned by being active',
    columns: true,
  },
  {
    cats: ['pings'],
    emoji: '',
    heading: 'Notification Roles',
    subheading: 'Self-assignable pings',
    columns: false,
  },
  { cats: ['other'], emoji: '', heading: 'Other Roles', subheading: '', columns: false },
];

function rulesPanel(input: GeneratorInput, blocks: RuleBlock[], kind: PanelKind): InfoPanel {
  const name = input.serverName.toUpperCase();
  const panel = emptyPanel(kind);
  panel.title =
    kind === 'staff-rules' ? `🛡️ ${name} — STAFF GUIDELINES` : `🏛️ ${name} — SERVER RULES`;
  const lead =
    kind === 'staff-rules'
      ? `These guidelines apply to every member of the **${input.serverName}** staff team.`
      : TONE_INTRO[input.tone](input.serverName);
  panel.description = [input.tagline.trim() ? `***${input.tagline.trim()}***` : '', lead]
    .filter(Boolean)
    .join('\n\n');
  panel.thumbnailUrl = input.iconUrl ?? '';
  panel.footer = TONE_OUTRO[input.tone];
  panel.sections = blocks.map((b) =>
    emptySection({
      emoji: b.emoji,
      heading: b.heading,
      body: [b.intro, b.lines.map((l) => `- ${l}`).join('\n')].join('\n\n'),
    }),
  );
  return panel;
}

function rolesPanel(input: GeneratorInput): InfoPanel {
  const panel = emptyPanel('roles');
  panel.title = `${input.serverName} Role Requirements`;
  panel.description = `Welcome to ${input.serverName} Role Requirements. The following consists of information you'll need to know about ${input.serverName}'s requestable and non-requestable roles, followed by the requirements you need to obtain them.`;
  panel.thumbnailUrl = input.iconUrl ?? '';
  panel.footer = 'To request a role, open a ticket with proof that you meet the requirements.';

  const roles = [...input.roles]
    .filter((r) => r.name !== '@everyone')
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  const byCat = new Map<RoleCategory, GuildRoleLike[]>();
  for (const r of roles) {
    const cat = categorize(r.name);
    byCat.set(cat, [...(byCat.get(cat) ?? []), r]);
  }

  for (const group of ROLE_GROUPS) {
    const members = group.cats.flatMap((c) => (byCat.get(c) ?? []).map((r) => [r, c] as const));
    if (!members.length) continue;
    const inline = group.columns && members.length >= 2;
    panel.sections.push(
      emptySection({
        emoji: group.emoji,
        heading: group.heading,
        subheading: group.subheading,
        items: members.map(([role, cat]) =>
          emptyItem({
            roleId: role.id,
            label: roleLabel(role.name, cat),
            text: describeRole(role, cat, input),
            inline,
          }),
        ),
        note: group.cats.includes('studio')
          ? 'Please Note: Testers are *non-eligible* for these roles.'
          : '',
      }),
    );
  }
  if (!panel.sections.length) {
    panel.sections.push(
      emptySection({
        heading: 'Roles',
        body: 'Add your roles here — pick a role on each entry to mention it.',
        items: [emptyItem()],
      }),
    );
  }
  return panel;
}

function serverInfoPanel(input: GeneratorInput): InfoPanel {
  const panel = emptyPanel('server-info');
  const nicheLine: Record<ServerNiche, string> = {
    community: 'a friendly community to hang out, meet new people and have fun',
    gaming: 'a home for gamers to squad up, compete and share their best moments',
    development: 'a networking hub for developers, content creators and studios',
    creator: 'a space for creators to grow, collaborate and support each other',
    business: 'a network of founders and professionals building real businesses',
  };
  panel.title = `👋 Welcome to ${input.serverName}`;
  panel.description = [
    input.tagline.trim() ? `***${input.tagline.trim()}***` : '',
    `**${input.serverName}** is ${nicheLine[input.niche]}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  panel.thumbnailUrl = input.iconUrl ?? '';
  panel.numbered = false;

  const staff = input.roles.filter((r) => ['owner', 'staff'].includes(categorize(r.name)));
  panel.sections = [
    emptySection({
      emoji: '🚀',
      heading: 'Getting Started',
      body: [
        '- Read the rules before chatting.',
        '- Grab your roles to unlock channels and pings.',
        '- Introduce yourself and say hi!',
      ].join('\n'),
    }),
    emptySection({
      emoji: '📌',
      heading: 'What We Offer',
      body:
        input.niche === 'development'
          ? '- Portfolio & showcase channels\n- Hiring and commission boards\n- Studio and developer networking'
          : input.niche === 'gaming'
            ? '- LFG and squad channels\n- Events, tournaments and giveaways\n- Clips and highlights'
            : '- Active chats and voice channels\n- Events and giveaways\n- A helpful, friendly staff team',
    }),
    emptySection({
      emoji: '🛡️',
      heading: 'Staff Team',
      body: staff.length
        ? `Need help? Reach out to ${staff
            .slice(0, 4)
            .map((r) => `<@&${r.id}>`)
            .join(', ')} or open a ticket.`
        : 'Need help? Open a ticket and a staff member will be with you shortly.',
    }),
    emptySection({
      emoji: '🔗',
      heading: 'Useful Links',
      body: '- Website: https://example.com\n- Socials: @yourserver',
    }),
  ];
  return panel;
}

/** Builds a complete, polished panel from a few answers and the guild's roles. */
export function generatePanel(input: GeneratorInput): InfoPanel {
  const name = input.serverName.trim() || 'Our Server';
  const normalized = { ...input, serverName: name };
  switch (input.kind) {
    case 'rules':
      return rulesPanel(
        normalized,
        [...CORE_RULES.slice(0, 1), ...NICHE_RULES[input.niche], ...CORE_RULES.slice(1), TOS_RULE],
        'rules',
      );
    case 'staff-rules':
      return rulesPanel(normalized, STAFF_RULES, 'staff-rules');
    case 'roles':
      return rolesPanel(normalized);
    case 'server-info':
      return serverInfoPanel(normalized);
  }
}
