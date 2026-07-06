'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { MoneyTrailData } from '@/lib/intel/financial';
import { NetworkGraphView } from '@/components/NetworkGraph';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { RoleGate } from '@/components/RoleGate';

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function FinancialPageInner() {
  const [data, setData] = useState<MoneyTrailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRing, setSelectedRing] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<MoneyTrailData>('/api/financial')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  const visibleGraph = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    if (selectedRing === null) return data.graph;
    const ring = data.rings[selectedRing];
    if (!ring) return data.graph;
    const ids = new Set(ring.accounts.map((account) => `a:${account.assetId}`));
    return {
      nodes: data.graph.nodes.filter((node) => ids.has(node.id)),
      edges: data.graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    };
  }, [data, selectedRing]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Tracing financial flows…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Crime Intelligence"
        subtitle="Transaction link analysis, money trail visualization and circular-transfer detection (Module G)"
      />

      <div className="stagger grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="font-display text-3xl font-black text-[var(--text-primary)]">
            {data.stats.transferCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Transactions analysed</div>
        </div>
        <div className="card p-5">
          <div className="font-display text-3xl font-black text-[var(--text-primary)]">
            {data.rings.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Circular transfer rings</div>
        </div>
        <div className="card p-5">
          <div className="font-display text-3xl font-black text-[var(--accent)]">
            {formatInr(data.stats.flaggedVolume)}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Volume in flagged rings</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card
          title={`Suspicious rings (${data.rings.length})`}
          subtitle="Funds returning to their origin through 3+ accounts — a layering indicator (G3)"
        >
          <ul className="space-y-2.5">
            <li>
              <button
                type="button"
                onClick={() => setSelectedRing(null)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  selectedRing === null
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border-1)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                }`}
              >
                Show full transaction network
              </button>
            </li>
            {data.rings.map((ring, index) => (
              <li key={ring.accounts.map((account) => account.assetId).join('-')}>
                <button
                  type="button"
                  onClick={() => setSelectedRing(index)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selectedRing === index
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-1)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Ring #{index + 1} · {ring.accounts.length} accounts
                    </span>
                    <span className="font-display font-bold text-[var(--accent)]">
                      {formatInr(ring.totalAmount)}
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {ring.accounts.map((account) => account.ownerName).join(' → ')} → back to
                    origin
                  </div>
                </button>
              </li>
            ))}
            {data.rings.length === 0 && (
              <li className="text-sm text-[var(--text-muted)]">No circular flows detected.</li>
            )}
          </ul>
        </Card>

        <Card
          title={
            selectedRing === null
              ? 'Money trail — significant flows'
              : `Money trail — Ring #${selectedRing + 1}`
          }
          subtitle="Accounts as nodes, transfers as links; hover to isolate (G2)"
        >
          {visibleGraph.nodes.length > 0 ? (
            <NetworkGraphView graph={visibleGraph} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              No significant flows to display.
            </div>
          )}
        </Card>
      </div>

      <Card
        title="High-value transfers"
        subtitle={`Individual transactions above ₹1,00,000 (G1) — top ${data.highValueTransfers.length}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">From</th>
                <th className="pb-2 pr-3 font-medium">To</th>
                <th className="pb-2 pr-3 font-medium">Amount</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.highValueTransfers.map((row, index) => (
                <tr key={index} className="border-t border-[var(--border-1)]">
                  <td className="py-2.5 pr-3">
                    <span className="text-[var(--text-primary)]">{row.fromOwner}</span>
                    <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                      {row.from}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="text-[var(--text-primary)]">{row.toOwner}</span>
                    <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                      {row.to}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-display font-bold text-[var(--text-primary)]">
                    {formatInr(row.amount)}
                  </td>
                  <td className="py-2.5 text-xs text-[var(--text-secondary)]">
                    {row.occurredAt.slice(0, 10)}
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

export default function FinancialPage() {
  return (
    <RoleGate allow={['Analyst', 'Supervisor', 'Administrator']}>
      <FinancialPageInner />
    </RoleGate>
  );
}
