'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { SociologyResult } from '@/lib/intel/sociology';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';

const RISK_STYLES: Record<string, string> = {
  High:   'bg-red-500/15 text-red-700 font-bold',
  Medium: 'bg-amber-500/15 text-amber-700 font-semibold',
  Low:    'bg-emerald-500/15 text-emerald-700',
};

function CorrelationCard({ label, r }: { label: string; r: number }) {
  const direction = r > 0.1 ? 'positive' : r < -0.1 ? 'negative' : 'negligible';
  const dirColor =
    direction === 'positive'
      ? 'text-amber-600'
      : direction === 'negative'
      ? 'text-emerald-600'
      : 'text-[var(--text-muted)]';
  return (
    <Card title={label}>
      <div className="flex flex-col items-center gap-1 py-2">
        <span className={`font-display text-4xl font-black tabular-nums ${dirColor}`}>
          {r >= 0 ? '+' : ''}{r.toFixed(3)}
        </span>
        <span className="text-xs text-[var(--text-muted)] capitalize">{direction} correlation</span>
        <span className="mt-1 max-w-xs text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          Pearson r across {10} Karnataka districts
        </span>
      </div>
    </Card>
  );
}

export default function SociologyPage() {
  const [data, setData] = useState<SociologyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SociologyResult>('/api/sociology')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Correlating crime data with census indicators…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sociological Intelligence"
        subtitle="District crime rates correlated with 2011 Census indicators — Module D"
      />

      {/* Honest caveat — always visible */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/60 px-4 py-3">
        <span className="mt-0.5 text-[var(--text-muted)]" aria-hidden>ℹ</span>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Correlation ≠ causation.</span>{' '}
          These indicators surface socioeconomic patterns to help prioritise resource allocation and
          community outreach — not to suggest that Census groups cause crime. All data is 2011
          Census (static) joined to the active workspace&apos;s FIR records.
        </p>
      </div>

      {/* Correlation callouts */}
      <div className="grid gap-6 sm:grid-cols-2">
        <CorrelationCard
          label="Crime rate vs Literacy rate"
          r={data.pearsonCrimeLiteracy}
        />
        <CorrelationCard
          label="Crime rate vs Urbanisation rate"
          r={data.pearsonCrimeUrbanization}
        />
      </div>

      {/* District table */}
      <Card
        title="District socioeconomic risk profiles"
        subtitle="Joined from active workspace FIRs + Karnataka Census 2011"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-4 font-medium">District</th>
                <th className="pb-2 pr-4 font-medium text-right">FIRs</th>
                <th className="pb-2 pr-4 font-medium text-right">Crime / 100k</th>
                <th className="pb-2 pr-4 font-medium text-right">Literacy %</th>
                <th className="pb-2 pr-4 font-medium text-right">Urban %</th>
                <th className="pb-2 font-medium">Social Risk</th>
              </tr>
            </thead>
            <tbody>
              {data.profiles
                .slice()
                .sort((a, b) => b.socialRiskScore - a.socialRiskScore)
                .map((profile) => (
                  <tr key={profile.district} className="border-t border-[var(--border-1)]">
                    <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                      {profile.district}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {profile.crimeCount}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {profile.crimeRatePer100k.toFixed(1)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {profile.literacyPct.toFixed(1)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {profile.urbanizationPct.toFixed(1)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${
                          RISK_STYLES[profile.socialRiskCategory] ?? ''
                        }`}
                      >
                        {profile.socialRiskCategory} · {profile.socialRiskScore}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
