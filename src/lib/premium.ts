import { BarChart3, Gauge, Palette, Search, Sparkles, Tags, TrendingUp, type LucideIcon } from 'lucide-react';

/** Premium price, how to buy, and the perks list — shared by the public and dashboard Premium pages. */

export const PREMIUM_PRICE = '£5';
export const PAYPAL_URL = 'https://paypal.me/zxmee/5';

export const PREMIUM_PERKS: { icon: LucideIcon; title: string; description: string; free: string; premium: string }[] = [
  {
    icon: Palette,
    title: 'Custom bot branding',
    description: 'A permanent bot nickname and your own footer on every bot message.',
    free: '—',
    premium: 'Included',
  },
  {
    icon: TrendingUp,
    title: 'Advanced leveling',
    description: 'Role and channel XP multipliers, voice XP and level-up images.',
    free: '5 role rewards',
    premium: '25 rewards + boosts',
  },
  {
    icon: Search,
    title: 'Searchable server logs',
    description: 'Find deleted and edited messages, joins, leaves and role changes.',
    free: 'Log channels only',
    premium: '30 days searchable',
  },
  {
    icon: BarChart3,
    title: 'Longer analytics',
    description: 'Messages, joins, leaves and growth over time.',
    free: '14 days',
    premium: '90 days',
  },
  {
    icon: Tags,
    title: 'More role menus',
    description: 'Self-assign role menus with more roles each.',
    free: '3 menus × 5 roles',
    premium: '25 menus × 25 roles',
  },
  {
    icon: Gauge,
    title: 'More templates',
    description: 'Build whole server layouts from a design.',
    free: '2 a day',
    premium: '10 a day',
  },
  {
    icon: Sparkles,
    title: 'Social auto-post, custom commands & more',
    description: 'Auto-post your socials, 5 custom commands, priority support and early access.',
    free: '—',
    premium: 'Included',
  },
];

export const HOW_TO_BUY = [
  `Pay ${PREMIUM_PRICE} with PayPal.`,
  'Message the owner with your Discord username to get activated.',
  'Open a server you manage here and turn Premium on (up to 2 servers).',
];
