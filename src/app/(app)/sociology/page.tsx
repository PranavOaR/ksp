'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { SociologyResult } from '@/lib/intel/sociology';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { useLanguage, type MessageKey } from '@/lib/i18n';

const RISK_STYLES: Record<string, string> = {
  High:   'bg-red-500/15 text-red-700 font-bold',
  Medium: 'bg-amber-500/15 text-amber-700 font-semibold',
  Low:    'bg-emerald-500/15 text-emerald-700',
};

/** Maps the direction string to the correct i18n key. */
const DIRECTION_KEY: Record<'positive' | 'negative' | 'negligible', MessageKey> = {
  positive: 'sociology.correlation.positive',
  negative: 'sociology.correlation.negative',
  negligible: 'sociology.correlation.negligible',
};

function CorrelationCard({ labelKey, r }: { labelKey: MessageKey; r: number }) {
  const { t } = useLanguage();
  const direction: 'positive' | 'negative' | 'negligible' =
    r > 0.1 ? 'positive' : r < -0.1 ? 'negative' : 'negligible';
  const dirColor =
    direction === 'positive'
      ? 'text-amber-600'
      : direction === 'negative'
      ? 'text-emerald-600'
      : 'text-[var(--text-muted)]';
  return (
    <Card title={t(labelKey)}>
      <div className="flex flex-col items-center gap-1 py-2">
        <span className={`font-display text-4xl font-black tabular-nums ${dirColor}`}>
          {r >= 0 ? '+' : ''}{r.toFixed(3)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{t(DIRECTION_KEY[direction])}</span>
        <span className="mt-1 max-w-xs text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          {t('sociology.correlation.pearson')} {10} {t('sociology.correlation.districts')}
        </span>
      </div>
    </Card>
  );
}

export default function SociologyPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<SociologyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SociologyResult>('/api/sociology')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label={t('sociology.loading')} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sociology.title')}
        subtitle={t('sociology.subtitle')}
      />

      {/* Honest caveat — always visible */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/60 px-4 py-3">
        <span className="mt-0.5 text-[var(--text-muted)]" aria-hidden>ℹ</span>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{t('sociology.caveat.prefix')}</span>{' '}
          {t('sociology.caveat.body')}
        </p>
      </div>

      {/* Correlation callouts */}
      <div className="grid gap-6 sm:grid-cols-2">
        <CorrelationCard
          labelKey="sociology.correlation.label.literacy"
          r={data.pearsonCrimeLiteracy}
        />
        <CorrelationCard
          labelKey="sociology.correlation.label.urbanisation"
          r={data.pearsonCrimeUrbanization}
        />
      </div>

      {/* District table */}
      <Card
        title={t('sociology.profiles.title')}
        subtitle={t('sociology.profiles.subtitle')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-4 font-medium">{t('sociology.profiles.col.district')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('sociology.profiles.col.firs')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('sociology.profiles.col.crimeRate')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('sociology.profiles.col.literacy')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('sociology.profiles.col.urban')}</th>
                <th className="pb-2 font-medium">{t('sociology.profiles.col.socialRisk')}</th>
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
