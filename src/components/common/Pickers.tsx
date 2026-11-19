import { X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { useGuildChannels, useGuildRoles } from '@/hooks/useGuild';
import { cn } from '@/lib/utils';

/* Channel / role pickers shared by the settings-style pages. */

interface PickerProps {
  guildId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ChannelPicker({ guildId, value, onChange, placeholder = 'Off', className, disabled }: PickerProps) {
  const { data: channels = [] } = useGuildChannels(guildId);
  return (
    <Select
      value={value ?? ''}
      onChange={(v) => onChange(v || null)}
      disabled={disabled}
      className={cn('w-full sm:w-60', className)}
      options={[{ value: '', label: placeholder }, ...channels.map((c) => ({ value: c.id, label: `# ${c.name}` }))]}
    />
  );
}

export function RolePicker({ guildId, value, onChange, placeholder = 'None', className, disabled }: PickerProps) {
  const { data: roles = [] } = useGuildRoles(guildId);
  return (
    <Select
      value={value ?? ''}
      onChange={(v) => onChange(v || null)}
      disabled={disabled}
      className={cn('w-full sm:w-60', className)}
      options={[{ value: '', label: placeholder }, ...roles.map((r) => ({ value: r.id, label: `@ ${r.name}` }))]}
    />
  );
}

/** Pick several channels or roles; shown as removable chips. */
export function MultiPicker({
  guildId,
  kind,
  value,
  onChange,
  addLabel,
  disabled,
}: {
  guildId: string;
  kind: 'channel' | 'role';
  value: string[];
  onChange: (ids: string[]) => void;
  addLabel: string;
  disabled?: boolean;
}) {
  const { data: channels = [] } = useGuildChannels(guildId);
  const { data: roles = [] } = useGuildRoles(guildId);
  const items = kind === 'channel' ? channels.map((c) => ({ id: c.id, name: `# ${c.name}` })) : roles.map((r) => ({ id: r.id, name: `@ ${r.name}` }));
  const name = (id: string) => items.find((i) => i.id === id)?.name ?? (kind === 'channel' ? '# deleted' : '@ deleted');

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-md border bg-surface-raised px-2 py-1 text-xs">
              {name(id)}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-ink-faint hover:text-ink"
                aria-label={`Remove ${name(id)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Select
        value=""
        disabled={disabled}
        onChange={(id) => id && !value.includes(id) && onChange([...value, id])}
        className="w-full sm:w-60"
        options={[
          { value: '', label: addLabel },
          ...items.filter((i) => !value.includes(i.id)).map((i) => ({ value: i.id, label: i.name })),
        ]}
      />
    </div>
  );
}
