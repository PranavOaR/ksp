'use client';

import { useMemo, useState } from 'react';
import type { NetworkGraph as GraphData, GraphNode } from '@/lib/intel/types';

const WIDTH = 900;
const HEIGHT = 560;
const ITERATIONS = 260;

const KIND_COLORS: Record<GraphNode['kind'], string> = {
  person: '#3987e5',
  fir: '#c98500',
  phone: '#199e70',
  vehicle: '#d95926',
  bank_account: '#9085e9',
  station: '#e66767',
};

const KIND_LABELS: Record<GraphNode['kind'], string> = {
  person: 'Person',
  fir: 'FIR',
  phone: 'Phone',
  vehicle: 'Vehicle',
  bank_account: 'Bank account',
  station: 'Station',
};

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

/**
 * Small deterministic force layout (repulsion + spring + centering) computed
 * synchronously — no animation loop, no external graph library.
 */
function layoutGraph(graph: GraphData): PositionedNode[] {
  const nodes: PositionedNode[] = graph.nodes.map((node, index) => {
    const angle = (index / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
    const radius = 60 + node.hop * 150;
    return {
      ...node,
      x: WIDTH / 2 + Math.cos(angle * (node.hop + 1) * 1.7 + index) * radius,
      y: HEIGHT / 2 + Math.sin(angle * (node.hop + 1) * 1.7 + index) * radius,
    };
  });
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const springLength = 90;

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const cooling = 1 - iteration / ITERATIONS;
    // Pairwise repulsion
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = Math.max(dx * dx + dy * dy, 64);
        const force = (2600 / distSq) * cooling;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].x -= fx;
        nodes[i].y -= fy;
        nodes[j].x += fx;
        nodes[j].y += fy;
      }
    }
    // Edge springs
    for (const edge of graph.edges) {
      const a = nodes[indexById.get(edge.source) ?? -1];
      const b = nodes[indexById.get(edge.target) ?? -1];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = ((dist - springLength) / dist) * 0.05 * cooling;
      a.x += dx * force;
      a.y += dy * force;
      b.x -= dx * force;
      b.y -= dy * force;
    }
    // Gentle centering + bounds
    for (const node of nodes) {
      node.x += (WIDTH / 2 - node.x) * 0.005 * cooling;
      node.y += (HEIGHT / 2 - node.y) * 0.005 * cooling;
      node.x = Math.min(WIDTH - 30, Math.max(30, node.x));
      node.y = Math.min(HEIGHT - 24, Math.max(24, node.y));
    }
  }
  return nodes;
}

export function NetworkGraphView({ graph }: { graph: GraphData }) {
  const nodes = useMemo(() => layoutGraph(graph), [graph]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const neighborIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const ids = new Set<string>([hoveredId]);
    for (const edge of graph.edges) {
      if (edge.source === hoveredId) ids.add(edge.target);
      if (edge.target === hoveredId) ids.add(edge.source);
    }
    return ids;
  }, [hoveredId, graph.edges]);

  const usedKinds = [...new Set(graph.nodes.map((node) => node.kind))];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4">
        {usedKinds.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: KIND_COLORS[kind] }}
            />
            {KIND_LABELS[kind]}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-1)] bg-[var(--surface-0)]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="min-w-[640px]" role="img" aria-label="Criminal network graph">
          {graph.edges.map((edge) => {
            const a = nodeById.get(edge.source);
            const b = nodeById.get(edge.target);
            if (!a || !b) return null;
            const isDimmed = hoveredId !== null && !(neighborIds.has(a.id) && neighborIds.has(b.id));
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#243149"
                strokeWidth={1}
                opacity={isDimmed ? 0.25 : 0.9}
              />
            );
          })}
          {nodes.map((node) => {
            const isRoot = node.hop === 0;
            const isDimmed = hoveredId !== null && !neighborIds.has(node.id);
            const radius = isRoot ? 11 : node.kind === 'person' ? 8 : 6;
            return (
              <g
                key={node.id}
                opacity={isDimmed ? 0.3 : 1}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={KIND_COLORS[node.kind]}
                  stroke="#0b1220"
                  strokeWidth={2}
                />
                {(isRoot || node.kind === 'person' || hoveredId === node.id) && (
                  <text
                    x={node.x}
                    y={node.y - radius - 5}
                    textAnchor="middle"
                    fontSize={isRoot ? 12 : 10}
                    fontWeight={isRoot ? 700 : 400}
                    fill={isRoot ? '#e8edf6' : '#9aa8c0'}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {hoveredId ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {nodeById.get(hoveredId)?.label} — {KIND_LABELS[nodeById.get(hoveredId)!.kind]}, {
            graph.edges.filter((edge) => edge.source === hoveredId || edge.target === hoveredId).length
          } connections
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Hover a node to isolate its direct connections.
        </p>
      )}
    </div>
  );
}
