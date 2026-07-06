'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { CaseIntelligence } from '@/lib/intel/caseIntel';
import { Card, ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/ui';

function PersonList({
  people,
  emptyLabel,
}: {
  people: CaseIntelligence['accused'];
  emptyLabel: string;
}) {
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
              {person.priorCases} cases on record
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CaseIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    apiFetch<CaseIntelligence>(`/api/cases/${params.id}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Assembling case intelligence…" />;

  const { fir } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fir.fir_number}
        subtitle={`${fir.crime_type} · ${fir.district} · ${fir.station_name}`}
      />

      <Card title="Automated case summary" subtitle="Generated from FIR record and linked entities (F1)">
        <div className="mb-3 flex items-center gap-3">
          <StatusBadge status={fir.status} />
          <span className="text-xs text-[var(--text-muted)]">
            Occurred {fir.occurred_at.replace('T', ' at ')}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {fir.description} The case is currently <strong>{fir.status.toLowerCase()}</strong>
          {data.accused.length > 0 &&
            ` with ${data.accused.length} named accused${
              data.accused.some((person) => (person.priorCases ?? 0) > 1)
                ? ', including repeat offenders'
                : ''
            }`}
          . Modus operandi: {fir.modus_operandi.toLowerCase()}.
        </p>
      </Card>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title="Accused">
          <PersonList people={data.accused} emptyLabel="No accused identified yet." />
        </Card>
        <Card title="Victims">
          <PersonList people={data.victims} emptyLabel="No victims recorded." />
        </Card>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <Card title="Investigation timeline" subtitle="Chronology of recorded events (F2)">
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

        <Card title="Suggested investigative leads" subtitle="Generated from network and financial links (F4)">
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

      <Card title="Similar cases" subtitle="Matched on modus operandi, crime type and location (F3)">
        {data.similarCases.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No similar cases found.</p>
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
