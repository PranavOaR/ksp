'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { Card, ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/ui';

interface OverviewData {
  kpis: {
    totalFirs: number;
    solvedRate: number;
    repeatOffenders: number;
    highRiskOffenders: number;
    crimeRings: number;
  };
  alerts: Array<{ district: string; growthPercent: number; message: string }>;
  recentFirs: Array<{
    id: number;
    fir_number: string;
    crime_type: string;
    district: string;
    occurred_at: string;
    status: string;
  }>;
}

const KPI_DEFS: Array<{ key: keyof OverviewData['kpis']; label: string; suffix?: string }> = [
  { key: 'totalFirs', label: 'FIRs on record' },
  { key: 'solvedRate', label: 'Solved rate', suffix: '%' },
  { key: 'repeatOffenders', label: 'Repeat offenders' },
  { key: 'highRiskOffenders', label: 'High-risk offenders' },
  { key: 'crimeRings', label: 'Crime rings detected' },
];

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OverviewData>('/api/overview').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Overview"
        subtitle="Live intelligence picture across 10 districts — synthetic demonstration data"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {KPI_DEFS.map(({ key, label, suffix }) => (
          <div key={key} className="card p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {data.kpis[key]}
              {suffix ?? ''}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Early warning alerts" subtitle="Emerging hotspots this quarter (Module H2)">
          {data.alerts.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No emerging hotspots detected.</p>
          ) : (
            <ul className="space-y-2">
              {data.alerts.map((alert) => (
                <li
                  key={alert.district}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90"
                >
                  <span aria-hidden>⚠</span>
                  {alert.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Full temporal, geographic and forecast views in{' '}
            <Link href="/analytics" className="text-[var(--series-1)] hover:underline">
              Analytics
            </Link>
            .
          </p>
        </Card>

        <Card title="Latest FIRs" subtitle="Most recently registered cases">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)]">
                  <th className="pb-2 pr-3 font-medium">FIR</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">District</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFirs.map((fir) => (
                  <tr key={fir.id} className="border-t border-[var(--border-1)]">
                    <td className="py-2 pr-3">
                      <Link href={`/cases/${fir.id}`} className="text-[var(--series-1)] hover:underline">
                        {fir.fir_number}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-secondary)]">{fir.crime_type}</td>
                    <td className="py-2 pr-3 text-[var(--text-secondary)]">{fir.district}</td>
                    <td className="py-2">
                      <StatusBadge status={fir.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Ask the Copilot" subtitle="Natural-language access to the crime database (Module A)">
        <div className="flex flex-wrap gap-2">
          {[
            'Show all burglary FIRs in Bengaluru during March 2026',
            'List repeat offenders involved in cybercrime',
            'How many vehicle thefts in Mysuru in 2025?',
          ].map((example) => (
            <Link
              key={example}
              href={`/copilot?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--series-1)] hover:text-[var(--text-primary)]"
            >
              “{example}”
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
