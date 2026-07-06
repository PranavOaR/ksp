'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { AuditEntry } from '@/lib/audit';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { RoleGate } from '@/components/RoleGate';

const ACTION_LABELS: Record<string, string> = {
  chat_query: 'Copilot query',
  view_analytics: 'Viewed analytics',
  view_offenders: 'Viewed offender register',
  explore_network: 'Explored network',
  view_crime_rings: 'Viewed crime rings',
  view_overview: 'Viewed overview',
  list_cases: 'Listed cases',
  view_case: 'Opened case file',
};

function AuditPageInner() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ entries: AuditEntry[] }>('/api/audit')
      .then((data) => setEntries(data.entries))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!entries) return <LoadingState label="Loading audit trail…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Every query, view and export is logged with the acting role (Module J2 — 100% auditability)"
      />
      <Card title={`${entries.length} most recent events`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">Time (UTC)</th>
                <th className="pb-2 pr-3 font-medium">Role</th>
                <th className="pb-2 pr-3 font-medium">Action</th>
                <th className="pb-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--border-1)]">
                  <td className="py-2 pr-3 font-mono text-xs text-[var(--text-secondary)]">
                    {entry.created_at}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                      {entry.actor_role}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-[var(--text-secondary)]">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="py-2 text-xs text-[var(--text-muted)]">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RoleGate allow={['Supervisor', 'Administrator']}>
      <AuditPageInner />
    </RoleGate>
  );
}
