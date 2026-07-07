'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { ForecastPoint } from '@/lib/intel/forecast';
import type { Hotspot } from '@/lib/intel/hotspots';
import type { MOCluster } from '@/lib/intel/moClusters';
import { BreakdownBar, DistributionBar } from '@/components/charts/BreakdownBar';
import { TrendChart } from '@/components/charts/TrendChart';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';

interface AnalyticsData {
  monthlyWithForecast: ForecastPoint[];
  byCrimeType: Array<{ name: string; count: number }>;
  byDistrict: Array<{ name: string; count: number }>;
  byHour: Array<{ hour: number; count: number }>;
  hotspots: Hotspot[];
  statusBreakdown: Array<{ name: string; count: number }>;
  moClusters: MOCluster[];
}

function HotspotList({ hotspots }: { hotspots: Hotspot[] }) {
  return (
    <ul className="space-y-2.5">
      {hotspots.map((hotspot) => (
        <li key={hotspot.region}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--text-primary)]">
              {hotspot.region}
              {hotspot.isEmerging && (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  ⚠ emerging +{hotspot.growthPercent}%
                </span>
              )}
            </span>
            <span className="text-[var(--text-muted)]">{hotspot.total} FIRs</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"
            role="img"
            aria-label={`${hotspot.region} intensity ${Math.round(hotspot.intensity * 100)}%`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${hotspot.intensity * 100}%`,
                backgroundColor: hotspot.isEmerging ? '#c98500' : '#3987e5',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MOPatternsList({ clusters }: { clusters: MOCluster[] }) {
  if (clusters.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No serial MO patterns detected.</p>;
  }
  return (
    <ul className="space-y-2">
      {clusters.slice(0, 8).map((cluster) => (
        <li
          key={cluster.mo}
          className="flex items-center justify-between rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/50 px-3 py-2"
        >
          <span className="text-sm text-[var(--text-primary)]">{cluster.mo}</span>
          <span className="ml-3 shrink-0 rounded-full bg-[var(--series-3)]/15 px-2.5 py-0.5 text-[11px] font-bold text-[var(--series-3)]">
            {cluster.count} cases
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AnalyticsData>('/api/analytics').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Computing analytics…" />;

  const hourData = data.byHour.map((row) => ({ ...row, hour: `${row.hour}:00` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crime Pattern & Trend Analytics"
        subtitle="Temporal, geographic and hotspot intelligence with a 3-month forecast (Modules C & H)"
      />

      <Card
        title="Monthly registered FIRs — history and forecast"
        subtitle="Dashed segment is a least-squares projection (H1)"
      >
        <TrendChart points={data.monthlyWithForecast} />
      </Card>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title="By crime type" subtitle="Distribution across offence categories (C4 input)">
          <BreakdownBar data={data.byCrimeType} />
        </Card>
        <Card title="By district" subtitle="Geographic distribution (C2)">
          <BreakdownBar data={data.byDistrict} color="#199e70" />
        </Card>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title="Hour-of-day pattern" subtitle="When crimes occur (C1) — note the night-hour concentration">
          <DistributionBar data={hourData} xKey="hour" />
        </Card>
        <Card title="Hotspot intensity" subtitle="Relative incident volume by district; amber = emerging cluster (C3, H3)">
          <HotspotList hotspots={data.hotspots} />
        </Card>
      </div>

      <Card
        title="Modus operandi serial patterns (C4)"
        subtitle="FIR groups sharing an identical modus operandi — potential serial offenders"
      >
        <MOPatternsList clusters={data.moClusters} />
      </Card>
    </div>
  );
}
