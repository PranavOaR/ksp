'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { FIR_STATUSES } from '@/lib/constants';
import type { CaseIntelligence } from '@/lib/intel/caseIntel';
import { Card, ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/ui';
import { useUser } from '@/components/UserProvider';
import { useLanguage } from '@/lib/i18n';

interface MOSerialPattern {
  isSerial: boolean;
  clusterSize: number;
  mo: string;
}

type CaseDetailData = CaseIntelligence & { moSerialPattern: MOSerialPattern };

function PersonList({
  people,
  emptyLabel,
}: {
  people: CaseIntelligence['accused'];
  emptyLabel: string;
}) {
  const { t } = useLanguage();
  if (people.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {people.map((person) => (
        <li
          key={person.id}
          className="flex items-center justify-between rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/50 px-3 py-2 text-sm"
        >
          <div>
            <span className="font-medium text-[var(--text-primary)]">{person.name}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              {person.gender}, {person.age} · {person.occupation}
            </span>
          </div>
          {typeof person.priorCases === 'number' && person.priorCases > 1 && (
            <span className="rounded bg-red-500/15 px-2 py-0.5 text-[11px] text-red-600">
              {person.priorCases} {t('caseDetail.summary.priorCases')}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CaseDetailPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const user = useUser();
  const canUpdateStatus = user.role === 'Supervisor' || user.role === 'Administrator';
  const [data, setData] = useState<CaseDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    apiFetch<CaseDetailData>(`/api/cases/${params.id}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  const updateStatus = async (status: string) => {
    if (!data) return;
    try {
      await apiFetch(`/api/cases/${params.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setData({ ...data, fir: { ...data.fir, status } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label={t('caseDetail.loading')} />;

  const { fir, moSerialPattern } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fir.fir_number}
        subtitle={`${fir.crime_type} · ${fir.district} · ${fir.station_name}`}
      />

      {/* A3: Serial MO banner — shown only when this FIR shares its MO with ≥1 other case */}
      {moSerialPattern.isSerial && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <span className="mt-0.5 text-amber-500" aria-hidden>⚠</span>
          <p className="text-sm text-amber-700">
            <span className="font-semibold">
              {t('caseDetail.serialBanner.label')} {moSerialPattern.clusterSize} {t('caseDetail.serialBanner.suffix')}:
            </span>{' '}
            <span className="italic">&ldquo;{moSerialPattern.mo}&rdquo;</span>. {t('caseDetail.serialBanner.cta')}
          </p>
        </div>
      )}

      <Card
        title={t('caseDetail.summary.title')}
        subtitle={t('caseDetail.summary.subtitle')}
      >
        <div className="mb-3 flex items-center gap-3">
          <StatusBadge status={fir.status} />
          {canUpdateStatus && (
            <select
              value={fir.status}
              onChange={(event) => void updateStatus(event.target.value)}
              className="btn-ghost px-3 py-1 text-xs outline-none"
              title={t('caseDetail.summary.statusUpdate')}
            >
              {FIR_STATUSES.map((statusOption) => (
                <option key={statusOption}>{statusOption}</option>
              ))}
            </select>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            {t('caseDetail.summary.occurred')} {fir.occurred_at.replace('T', ' at ')}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {fir.description} {t('caseDetail.summary.currentlyPrefix')} <strong>{fir.status.toLowerCase()}</strong>
          {data.accused.length > 0 &&
            ` ${t('caseDetail.summary.withAccused')} ${data.accused.length} ${t('caseDetail.summary.namedAccused')}${
              data.accused.some((person) => (person.priorCases ?? 0) > 1)
                ? t('caseDetail.summary.includingRepeat')
                : ''
            }`}
          . {t('caseDetail.summary.moPrefix')} {fir.modus_operandi.toLowerCase()}.
        </p>
      </Card>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title={t('caseDetail.accused.title')}>
          <PersonList people={data.accused} emptyLabel={t('caseDetail.accused.empty')} />
        </Card>
        <Card title={t('caseDetail.victims.title')}>
          <PersonList people={data.victims} emptyLabel={t('caseDetail.victims.empty')} />
        </Card>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card
          title={t('caseDetail.timeline.title')}
          subtitle={t('caseDetail.timeline.subtitle')}
        >
          <ol className="relative space-y-4 border-l border-[var(--border-1)] pl-5">
            {data.timeline.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-1)] bg-[var(--series-1)]" />
                <div className="text-[11px] text-[var(--text-muted)]">
                  {entry.at.replace('T', ' · ')}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{entry.event}</div>
              </li>
            ))}
          </ol>
        </Card>

        <Card
          title={t('caseDetail.leads.title')}
          subtitle={t('caseDetail.leads.subtitle')}
        >
          <ul className="space-y-2">
            {data.leads.map((lead) => (
              <li
                key={lead}
                className="flex items-start gap-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/50 px-3 py-2 text-sm text-[var(--text-secondary)]"
              >
                <span aria-hidden className="text-[var(--series-3)]">
                  ➤
                </span>
                {lead}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title={t('caseDetail.similar.title')}
        subtitle={t('caseDetail.similar.subtitle')}
      >
        {data.similarCases.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t('caseDetail.similar.none')}</p>
        ) : (
          <ul className="space-y-2">
            {data.similarCases.map((similar) => (
              <li
                key={similar.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-1)] px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    href={`/cases/${similar.id}`}
                    className="font-mono text-xs text-[var(--series-1)] hover:underline"
                  >
                    {similar.fir_number}
                  </Link>
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {similar.matchReason}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  {similar.occurred_at.slice(0, 10)}
                  <StatusBadge status={similar.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
