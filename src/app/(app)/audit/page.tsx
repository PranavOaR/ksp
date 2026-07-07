'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { AuditEntry } from '@/lib/audit';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { RoleGate } from '@/components/RoleGate';
import { useLanguage, type MessageKey } from '@/lib/i18n';

const ACTION_KEY_MAP: Record<string, MessageKey> = {
  chat_query: 'audit.action.chat_query',
  view_analytics: 'audit.action.view_analytics',
  view_offenders: 'audit.action.view_offenders',
  explore_network: 'audit.action.explore_network',
  view_crime_rings: 'audit.action.view_crime_rings',
  view_overview: 'audit.action.view_overview',
  list_cases: 'audit.action.list_cases',
  view_case: 'audit.action.view_case',
};

function AuditPageInner() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ entries: AuditEntry[] }>('/api/audit')
      .then((data) => setEntries(data.entries))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!entries) return <LoadingState label={t('audit.loading')} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
      />
      <Card title={`${entries.length} ${t('audit.recentEvents')}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">{t('audit.table.time')}</th>
                <th className="pb-2 pr-3 font-medium">{t('audit.table.role')}</th>
                <th className="pb-2 pr-3 font-medium">{t('audit.table.action')}</th>
                <th className="pb-2 font-medium">{t('audit.table.detail')}</th>
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
                    {ACTION_KEY_MAP[entry.action] ? t(ACTION_KEY_MAP[entry.action]) : entry.action}
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
