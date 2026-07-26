interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueSuffix?: string;
}

/** Shared glass tooltip for Recharts. Text uses ink tokens, not the series colour. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueSuffix,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="glass-raised rounded-lg px-3 py-2 text-xs shadow-soft">
      {label !== undefined && (
        <div className="text-ink-faint">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="mt-0.5 font-semibold text-ink">
        {value}
        {valueSuffix ? ` ${valueSuffix}` : ''}
      </div>
    </div>
  );
}
