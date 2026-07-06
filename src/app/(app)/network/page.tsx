'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { NetworkGraph } from '@/lib/intel/types';
import { NetworkGraphView } from '@/components/NetworkGraph';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';

interface RingSummary {
  members: number[];
  memberNames: string[];
  collaborationCount: number;
}

interface NetworkResponse {
  graph: NetworkGraph;
  rings: RingSummary[];
}

export default function NetworkPage() {
  const [rings, setRings] = useState<RingSummary[] | null>(null);
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [selected, setSelected] = useState<{ personId: number; name: string } | null>(null);
  const [hops, setHops] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  useEffect(() => {
    apiFetch<NetworkResponse>('/api/network')
      .then((data) => setRings(data.rings))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setIsLoadingGraph(true);
    apiFetch<NetworkResponse>(`/api/network?personId=${selected.personId}&hops=${hops}`)
      .then((data) => setGraph(data.graph))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoadingGraph(false));
  }, [selected, hops]);

  if (error) return <ErrorState message={error} />;
  if (!rings) return <LoadingState label="Detecting criminal networks…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Criminal Network Intelligence"
        subtitle="Organized crime rings detected from repeat co-offending, with entity-relationship exploration (Module B)"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card
          title={`Detected crime rings (${rings.length})`}
          subtitle="People repeatedly co-accused across FIRs"
        >
          <ul className="space-y-3">
            {rings.map((ring, index) => (
              <li key={ring.members.join('-')} className="rounded-lg border border-[var(--border-1)] p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Ring #{index + 1}</span>
                  <span className="text-[var(--text-muted)]">
                    {ring.members.length} members · {ring.collaborationCount} joint cases
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ring.memberNames.map((name, memberIndex) => (
                    <button
                      key={ring.members[memberIndex]}
                      type="button"
                      onClick={() =>
                        setSelected({ personId: ring.members[memberIndex], name })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                        selected?.personId === ring.members[memberIndex]
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={selected ? `Entities connected to ${selected.name}` : 'Entity relationship explorer'}
          subtitle={
            selected
              ? `Breadth-first expansion, ${hops} hop${hops > 1 ? 's' : ''} — persons, FIRs, phones, vehicles, accounts`
              : 'Select a person from a crime ring to expand their network'
          }
        >
          {selected && (
            <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>Hops:</span>
              {[1, 2, 3].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setHops(option)}
                  className={`rounded px-2 py-1 ${
                    hops === option
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {isLoadingGraph ? (
            <LoadingState label="Expanding network…" />
          ) : graph && graph.nodes.length > 0 ? (
            <NetworkGraphView graph={graph} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              {selected ? 'No connections found.' : '⬡ Pick a suspect to visualize their network'}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
