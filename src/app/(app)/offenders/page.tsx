'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { OffenderProfile } from '@/lib/intel/types';
import { Card, ErrorState, LoadingState, PageHeader, RiskBadge } from '@/components/ui';
import { useLanguage } from '@/lib/i18n';

type CategoryFilter = 'All' | 'High' | 'Medium' | 'Low';
const CATEGORY_FILTERS: CategoryFilter[] = ['All', 'High', 'Medium', 'Low'];

export default function OffendersPage() {
  const { t } = useLanguage();
  const [offenders, setOffenders] = useState<OffenderProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  useEffect(() => {
    apiFetch<{ offenders: OffenderProfile[] }>('/api/offenders')
      .then((data) => setOffenders(data.offenders))
      .catch((err: Error) => setError(err.message));
  }, []);

  const visible = useMemo(
    () =>
      (offenders ?? [])
        .filter((offender) => categoryFilter === 'All' || offender.riskCategory === categoryFilter)
        .sort((a, b) => b.riskScore - a.riskScore),
    [offenders, categoryFilter]
  );

  if (error) return <ErrorState message={error} />;
  if (!offenders) return <LoadingState label={t('offenders.loading')} />;

  const filterLabelKey: Record<CategoryFilter, Parameters<typeof t>[0]> = {
    All: 'offenders.filter.all',
    High: 'offenders.filter.high',
    Medium: 'offenders.filter.medium',
    Low: 'offenders.filter.low',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('offenders.title')}
        subtitle={t('offenders.subtitle')}
      />

      <div className="flex gap-2">
        {CATEGORY_FILTERS.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === category
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t(filterLabelKey[category])}
            {category !== 'All' &&
              ` (${offenders.filter((offender) => offender.riskCategory === category).length})`}
          </button>
        ))}
      </div>

      <Card title={`${visible.length} ${t('offenders.offenders')}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.name')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.profile')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.cases')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.crimeTypes')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.associates')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.lastActive')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offenders.table.riskScore')}</th>
                <th className="pb-2 font-medium">{t('offenders.table.category')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((offender) => (
                <tr key={offender.personId} className="border-t border-[var(--border-1)]">
                  <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                    {offender.name}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--text-secondary)]">
                    {offender.gender}, {offender.age} · {offender.occupation}
                    <br />
                    {offender.district}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{offender.caseCount}</td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--text-secondary)]">
                    {offender.crimeTypes.join(', ')}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                    {offender.networkDegree}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--text-secondary)]">
                    {offender.lastActive.slice(0, 10)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className={`h-full rounded-full ${
                            offender.riskCategory === 'High'
                              ? 'bg-red-500'
                              : offender.riskCategory === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${offender.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {offender.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <RiskBadge category={offender.riskCategory} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          {t('offenders.networkNote')}{' '}
          <Link href="/network" className="text-[var(--series-1)] hover:underline">
            {t('offenders.networkLink')}
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
