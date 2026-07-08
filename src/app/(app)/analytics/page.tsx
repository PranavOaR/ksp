'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { ForecastPoint } from '@/lib/intel/forecast';
import type { Hotspot } from '@/lib/intel/hotspots';
import type { MOCluster } from '@/lib/intel/moClusters';
import { BreakdownBar, DistributionBar } from '@/components/charts/BreakdownBar';
import { TrendChart } from '@/components/charts/TrendChart';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { useLanguage } from '@/lib/i18n';

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
  const { t } = useLanguage();
  return (
    <ul className="space-y-2.5">
      {hotspots.map((hotspot) => (
        <li key={hotspot.region}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--text-primary)]">
              {hotspot.region}
              {hotspot.isEmerging && (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  {t('analytics.hotspots.emerging')} +{hotspot.growthPercent}%
                </span>
              )}
            </span>
            <span className="text-[var(--text-muted)]">{hotspot.total} {t('analytics.hotspots.firs')}</span>
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
  const { t } = useLanguage();
  if (clusters.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{t('analytics.moCluster.none')}</p>;
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
            {cluster.count} {t('analytics.moCluster.cases')}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AnalyticsData>('/api/analytics').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label={t('analytics.loading')} />;

  const hourData = data.byHour.map((row) => ({ ...row, hour: `${row.hour}:00` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('analytics.title')}
        subtitle={t('analytics.subtitle')}
      />

      <Card
        title={t('analytics.monthly.title')}
        subtitle={t('analytics.monthly.subtitle')}
      >
        <TrendChart points={data.monthlyWithForecast} />
      </Card>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title={t('analytics.byCrimeType.title')} subtitle={t('analytics.byCrimeType.subtitle')}>
          <BreakdownBar data={data.byCrimeType} />
        </Card>
        <Card title={t('analytics.byDistrict.title')} subtitle={t('analytics.byDistrict.subtitle')}>
          <BreakdownBar data={data.byDistrict} color="#199e70" />
        </Card>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title={t('analytics.byHour.title')} subtitle={t('analytics.byHour.subtitle')}>
          <DistributionBar data={hourData} xKey="hour" />
        </Card>
        <Card title={t('analytics.hotspots.title')} subtitle={t('analytics.hotspots.subtitle')}>
          <HotspotList hotspots={data.hotspots} />
        </Card>
      </div>

      <Card
        title={t('analytics.moCluster.title')}
        subtitle={t('analytics.moCluster.subtitle')}
      >
        <MOPatternsList clusters={data.moClusters} />
      </Card>
    </div>
  );
}
