'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastPoint } from '@/lib/intel/forecast';
import { CHART } from './theme';

interface TrendRow {
  month: string;
  actual: number | null;
  forecast: number | null;
}

/** Splits the series into a solid historical line and a dashed forecast tail. */
function toRows(points: ForecastPoint[]): TrendRow[] {
  const lastActualIndex = points.reduce(
    (last, point, index) => (point.isForecast ? last : index),
    -1
  );
  return points.map((point, index) => ({
    month: point.month,
    actual: point.isForecast ? null : point.count,
    // Anchor the forecast line to the last actual point so the lines connect
    forecast: point.isForecast || index === lastActualIndex ? point.count : null,
  }));
}

export function TrendChart({ points }: { points: ForecastPoint[] }) {
  const rows = toRows(points);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="1 4" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: CHART.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: CHART.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={CHART.tooltip} cursor={{ stroke: CHART.grid }} />
          <Legend wrapperStyle={{ fontSize: 12, color: CHART.axisText }} />
          <Line
            name="Registered FIRs"
            dataKey="actual"
            stroke={CHART.series1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            name="Forecast"
            dataKey="forecast"
            stroke={CHART.series1}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.7}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
