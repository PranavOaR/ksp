'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { OffenderProfile } from '@/lib/intel/types';
import { Card, ErrorState, LoadingState, PageHeader, RiskBadge } from '@/components/ui';

const CATEGORY_FILTERS = ['All', 'High', 'Medium', 'Low'] as const;

export default function OffendersPage() {
  const [offenders, setOffenders] = useState<OffenderProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_FILTERS)[number]>('All');

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
  if (!offenders) return <LoadingState label="Scoring offender risk…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offender Risk Register"
        subtitle="Repeat offenders ranked by explainable risk score: prior offenses, network influence, recency, versatility (Module E)"
      />

      <div className="flex gap-2">
        {CATEGORY_FILTERS.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              categoryFilter === category
                ? 'bg-[#1c5cab] text-white'
                : 'border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {category}
            {category !== 'All' &&
              ` (${offenders.filter((offender) => offender.riskCategory === category).length})`}
          </button>
        ))}
      </div>

      <Card title={`${visible.length} offenders`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Profile</th>
                <th className="pb-2 pr-3 font-medium">Cases</th>
                <th className="pb-2 pr-3 font-medium">Crime types</th>
                <th className="pb-2 pr-3 font-medium">Associates</th>
                <th className="pb-2 pr-3 font-medium">Last active</th>
                <th className="pb-2 pr-3 font-medium">Risk score</th>
                <th className="pb-2 font-medium">Category</th>
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
          Explore an offender&apos;s connections in{' '}
          <Link href="/network" className="text-[var(--series-1)] hover:underline">
            Network Intel
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
