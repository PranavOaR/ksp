'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { Card, ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/ui';
import { useUser } from '@/components/UserProvider';

interface CaseRow {
  id: number;
  fir_number: string;
  crime_type: string;
  district: string;
  station_name: string;
  occurred_at: string;
  status: string;
}

interface CasesResponse {
  cases: CaseRow[];
  meta: { total: number; page: number; limit: number };
}

export default function CasesPage() {
  const user = useUser();
  const [data, setData] = useState<CasesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CasesResponse>(`/api/cases?page=${page}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [page]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Loading case files…" />;

  const totalPages = Math.ceil(data.meta.total / data.meta.limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Case Files"
          subtitle={`${data.meta.total} FIRs on record — open any case for the AI summary, timeline, similar cases and leads (Module F)`}
        />
        <div className="flex shrink-0 gap-2">
          {(user.role === 'Supervisor' || user.role === 'Administrator') && (
            <Link href="/cases/import" className="btn-ghost px-4 py-2.5 text-xs">
              ⬆ Bulk import
            </Link>
          )}
          <Link href="/cases/new" className="btn-primary px-5 py-2.5 text-xs">
            + New Case File
          </Link>
        </div>
      </div>

      {data.meta.total === 0 ? (
        <Card title="No case files yet">
          <p className="text-sm text-[var(--text-secondary)]">
            This is the Live workspace — it holds your unit&apos;s own records and starts empty.
            Register your first case file or bulk-import from CSV, and every intelligence module
            (Copilot, networks, hotspots, forecasts) will compute from your real data.
          </p>
          <Link href="/cases/new" className="btn-primary mt-4 inline-block px-5 py-2.5 text-xs">
            + Register first case file
          </Link>
        </Card>
      ) : (
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">FIR number</th>
                <th className="pb-2 pr-3 font-medium">Crime type</th>
                <th className="pb-2 pr-3 font-medium">District</th>
                <th className="pb-2 pr-3 font-medium">Police station</th>
                <th className="pb-2 pr-3 font-medium">Occurred</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.cases.map((caseRow) => (
                <tr key={caseRow.id} className="border-t border-[var(--border-1)]">
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/cases/${caseRow.id}`}
                      className="font-mono text-xs text-[var(--series-1)] hover:underline"
                    >
                      {caseRow.fir_number}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{caseRow.crime_type}</td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{caseRow.district}</td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--text-secondary)]">
                    {caseRow.station_name}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--text-secondary)]">
                    {caseRow.occurred_at.slice(0, 10)}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={caseRow.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((previous) => previous - 1)}
            className="btn-ghost px-4 py-1.5 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((previous) => previous + 1)}
            className="btn-ghost px-4 py-1.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </Card>
      )}
    </div>
  );
}
