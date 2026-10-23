import { Fragment, type ReactNode } from 'react';
import type { Embed, PanelMessage } from '@/lib/panels';

interface MentionLookup {
  roles: Map<string, { name: string; color: string }>;
  channels: Map<string, string>;
}

interface DiscordPanelPreviewProps extends Partial<MentionLookup> {
  messages: PanelMessage[];
  botName: string;
  avatarUrl?: string | null;
}

const INLINE =
  /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*|~~[^~]+?~~|`[^`]+?`|<@&\d+>|<#\d+>|\[[^\]]+\]\([^)\s]+\))/;

function rolePill(name: string, color: string, key: string): ReactNode {
  const c = color && color !== '#000000' ? color : '#c9cdfb';
  return (
    <span
      key={key}
      className="rounded px-0.5 font-medium"
      style={{ color: c, backgroundColor: `${c}26` }}
    >
      @{name}
    </span>
  );
}

function renderInline(text: string, lookup: MentionLookup, keyBase = 'i'): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6)
      return (
        <strong key={key} className="font-semibold italic text-white">
          {renderInline(part.slice(3, -3), lookup, key)}
        </strong>
      );
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return (
        <strong key={key} className="font-semibold text-white">
          {renderInline(part.slice(2, -2), lookup, key)}
        </strong>
      );
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4)
      return <u key={key}>{renderInline(part.slice(2, -2), lookup, key)}</u>;
    if (part.startsWith('~~') && part.endsWith('~~'))
      return <s key={key}>{renderInline(part.slice(2, -2), lookup, key)}</s>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={key} className="rounded bg-[#1e1f22] px-1 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={key}>{renderInline(part.slice(1, -1), lookup, key)}</em>;
    const role = part.match(/^<@&(\d+)>$/);
    if (role) {
      const r = lookup.roles.get(role[1]!);
      return rolePill(r?.name ?? 'unknown-role', r?.color ?? '', key);
    }
    const channel = part.match(/^<#(\d+)>$/);
    if (channel) {
      return (
        <span key={key} className="rounded bg-[#5865f2]/25 px-0.5 font-medium text-[#c9cdfb]">
          #{lookup.channels.get(channel[1]!) ?? 'unknown'}
        </span>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link)
      return (
        <span key={key} className="text-[#00a8fc] hover:underline">
          {link[1]}
        </span>
      );
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Renders the subset of Discord markdown that panels use. */
function Markdown({ text, lookup }: { text: string; lookup: MentionLookup }) {
  const lines = text.replace(/^>>> /, '> ').split('\n');
  const multiQuote = text.startsWith('>>> ');
  const out: ReactNode[] = [];
  let quote: string[] = [];

  const flushQuote = () => {
    if (!quote.length) return;
    out.push(
      <div key={`q${out.length}`} className="my-0.5 border-l-4 border-[#4e5058] pl-3">
        {quote.map((l, i) => (
          <div key={i}>{l ? renderInline(l, lookup, `q${out.length}-${i}`) : ' '}</div>
        ))}
      </div>,
    );
    quote = [];
  };

  lines.forEach((raw, idx) => {
    if (multiQuote || raw.startsWith('> ') || raw === '>') {
      quote.push(raw.replace(/^>\s?/, ''));
      return;
    }
    flushQuote();
    const key = `l${idx}`;
    let m: RegExpMatchArray | null;
    if ((m = raw.match(/^(#{1,3}) (.*)$/))) {
      const size = m[1]!.length === 1 ? 'text-2xl' : m[1]!.length === 2 ? 'text-xl' : 'text-base';
      out.push(
        <div key={key} className={`${size} mb-1 mt-2 font-bold leading-snug text-white first:mt-0`}>
          {renderInline(m[2]!, lookup, key)}
        </div>,
      );
    } else if ((m = raw.match(/^-# (.*)$/))) {
      out.push(
        <div key={key} className="text-xs text-[#949ba4]">
          {renderInline(m[1]!, lookup, key)}
        </div>,
      );
    } else if ((m = raw.match(/^(\s*)[-*] (.*)$/))) {
      const nested = m[1]!.length >= 2;
      out.push(
        <div key={key} className={`flex gap-2 ${nested ? 'pl-6' : 'pl-2'}`}>
          <span className="select-none text-[#b5bac1]">{nested ? '◦' : '•'}</span>
          <span className="min-w-0">{renderInline(m[2]!, lookup, key)}</span>
        </div>,
      );
    } else if (!raw.trim()) {
      out.push(<div key={key} className="h-2" />);
    } else {
      out.push(<div key={key}>{renderInline(raw, lookup, key)}</div>);
    }
  });
  flushQuote();
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-[1.375rem] text-[#dbdee1]">
      {out}
    </div>
  );
}

function EmbedCard({ embed, lookup }: { embed: Embed; lookup: MentionLookup }) {
  const color =
    embed.color !== undefined ? `#${embed.color.toString(16).padStart(6, '0')}` : '#1e1f22';
  const fields = embed.fields ?? [];

  // Inline fields sit three to a row; a non-inline field breaks the row.
  const rows: (typeof fields)[] = [];
  for (const f of fields) {
    const row = rows[rows.length - 1];
    if (f.inline && row && row.length < 3 && row.every((x) => x.inline)) row.push(f);
    else rows.push([f]);
  }

  return (
    <div
      className="mt-1 max-w-[520px] overflow-hidden rounded border-l-4 bg-[#2b2d31]"
      style={{ borderColor: color }}
    >
      <div className="flex gap-4 p-3 pr-4">
        <div className="min-w-0 flex-1">
          {embed.title && (
            <div className="mb-1 font-semibold text-white">
              {renderInline(embed.title, lookup, 't')}
            </div>
          )}
          {embed.description && <Markdown text={embed.description} lookup={lookup} />}
          {rows.map((row, r) => (
            <div
              key={r}
              className="mt-2 grid gap-x-4 gap-y-2"
              style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
            >
              {row.map((f, i) => (
                <div key={i} className="min-w-0">
                  {f.name !== '​' && (
                    <div className="mb-0.5 text-sm font-semibold text-white">
                      {renderInline(f.name, lookup, `f${r}${i}`)}
                    </div>
                  )}
                  <Markdown text={f.value} lookup={lookup} />
                </div>
              ))}
            </div>
          ))}
          {embed.image && (
            <img
              src={embed.image.url}
              alt=""
              className="mt-3 max-h-64 w-full rounded object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          {embed.footer && <div className="mt-2 text-xs text-[#b5bac1]">{embed.footer.text}</div>}
        </div>
        {embed.thumbnail && (
          <img
            src={embed.thumbnail.url}
            alt=""
            className="h-20 w-20 shrink-0 rounded object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
      </div>
    </div>
  );
}

/** A close match for how the panel renders in Discord's dark theme. */
export function DiscordPanelPreview({
  messages,
  botName,
  avatarUrl,
  roles,
  channels,
}: DiscordPanelPreviewProps) {
  const lookup: MentionLookup = { roles: roles ?? new Map(), channels: channels ?? new Map() };
  return (
    <div className="space-y-4 rounded-xl bg-[#313338] p-4 font-sans">
      {messages.map((message, m) => (
        <div key={m} className="flex gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-sm font-bold text-white">
              {botName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{botName}</span>
              <span className="rounded bg-[#5865f2] px-1 py-px text-[10px] font-semibold text-white">
                APP
              </span>
              <span className="text-xs text-[#949ba4]">Today at 12:00</span>
            </div>
            {message.embeds.map((embed, i) => (
              <EmbedCard key={i} embed={embed} lookup={lookup} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
