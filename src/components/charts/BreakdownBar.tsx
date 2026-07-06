'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from './theme';

interface BreakdownDatum {
  name: string;
  count: number;
}

/** Horizontal single-hue bar breakdown (magnitude across categories). */
export function BreakdownBar({
  data,
  color = CHART.series1,
  height = 280,
}: {
  data: BreakdownDatum[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 30 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="1 4" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: CHART.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: CHART.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
          />
          <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: 'rgba(57,135,229,0.08)' }} />
          <Bar dataKey="count" name="FIRs" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical single-hue distribution (e.g. hour-of-day). */
export function DistributionBar({
  data,
  xKey,
  color = CHART.series2,
}: {
  data: Array<Record<string, number | string>>;
  xKey: string;
  color?: string;
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="1 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: CHART.axisText, fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
          />
          <YAxis
            tick={{ fill: CHART.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: 'rgba(25,158,112,0.08)' }} />
          <Bar dataKey="count" name="FIRs" fill={color} radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
