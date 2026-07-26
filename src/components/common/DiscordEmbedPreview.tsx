import type { ReactNode } from 'react';

interface DiscordEmbedPreviewProps {
  guildName: string;
  title: string;
  message: string;
  useEmbed: boolean;
  embedColor: string;
  imageUrl: string | null;
  mentionUser: boolean;
}

const SAMPLE = { userName: 'NewMember', memberCount: 128 };

function substitute(template: string, guildName: string): string {
  return template
    .split('{user.name}')
    .join(SAMPLE.userName)
    .split('{user}')
    .join('@NewMember')
    .split('{server}')
    .join(guildName)
    .split('{memberCount}')
    .join(String(SAMPLE.memberCount));
}

function withMentions(text: string): ReactNode[] {
  return text.split('@NewMember').flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <span
            key={index}
            className="rounded bg-brand-500/30 px-1 font-medium text-brand-200"
          >
            @NewMember
          </span>,
          part,
        ],
  );
}

/** A faithful-ish preview of how the welcome message renders in Discord. */
export function DiscordEmbedPreview({
  guildName,
  title,
  message,
  useEmbed,
  embedColor,
  imageUrl,
  mentionUser,
}: DiscordEmbedPreviewProps) {
  const renderedTitle = withMentions(substitute(title, guildName));
  const renderedMessage = withMentions(substitute(message, guildName));

  return (
    <div className="rounded-xl bg-[#313338] p-4 font-sans text-[#dbdee1]">
      <div className="flex gap-3">
        <div className="brand-gradient grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white">
          N
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">NexusBot</span>
            <span className="rounded bg-brand-500 px-1 py-0.5 text-[10px] font-semibold uppercase text-white">
              Bot
            </span>
            <span className="text-xs text-[#949ba4]">Today at 12:00</span>
          </div>

          {mentionUser && (
            <div className="mt-1 text-sm">
              <span className="rounded bg-brand-500/30 px-1 font-medium text-brand-200">
                @NewMember
              </span>
            </div>
          )}

          {useEmbed ? (
            <div
              className="mt-2 max-w-md overflow-hidden rounded border-l-4 bg-[#2b2d31]"
              style={{ borderColor: embedColor }}
            >
              <div className="p-3">
                {title.trim() && (
                  <div className="text-sm font-semibold text-white">{renderedTitle}</div>
                )}
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#dbdee1]">
                  {renderedMessage}
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="mt-3 max-h-44 w-full rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {renderedMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
