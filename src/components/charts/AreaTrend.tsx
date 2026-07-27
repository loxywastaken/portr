import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import type { DailyPoint } from '@/types';

interface AreaTrendProps {
  data: DailyPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}

function shortDate(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Single-series trend area. One hue (contrast-validated against the dark
 * surface); recessive grid/axes; crosshair + glass tooltip on hover.
 */
export function AreaTrend({ data, color = '#d4d4d4', height = 240, valueSuffix }: AreaTrendProps) {
  const gradientId = `area-${useId().replace(/:/g, '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 11, fill: '#6b7180' }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          width={34}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7180' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.18)' }}
          content={
            <ChartTooltip labelFormatter={shortDate} valueSuffix={valueSuffix} />
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
