interface BarItem {
  label: string;
  value: number;
}

interface BarBreakdownProps {
  items: BarItem[];
  color?: string;
  emptyLabel?: string;
}

/**
 * Horizontal magnitude bars (single hue). Values are direct-labelled in ink
 * tokens; 4px rounded data-ends anchored to a recessive track.
 */
export function BarBreakdown({
  items,
  color = '#6366f1',
  emptyLabel = 'No data yet.',
}: BarBreakdownProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-faint">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate text-ink-muted">{item.label}</span>
            <span className="tabular-nums text-ink">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${color}, ${color}bb)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
