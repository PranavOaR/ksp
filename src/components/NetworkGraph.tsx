'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { NetworkGraph as GraphData, GraphNode } from '@/lib/intel/types';

const WIDTH = 900;
const HEIGHT = 560;
const ITERATIONS = 260;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 1.25;

interface Transform {
  k: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { k: 1, x: 0, y: 0 };

function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

/** Re-scale the view around a fixed point (in viewBox coords) so it stays put. */
function zoomAround(transform: Transform, nextK: number, px: number, py: number): Transform {
  const k = clampZoom(nextK);
  const cx = (px - transform.x) / transform.k;
  const cy = (py - transform.y) / transform.k;
  return { k, x: px - cx * k, y: py - cy * k };
}

/** Map a pointer position to viewBox coordinates regardless of rendered size. */
function toViewBox(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}

const KIND_COLORS: Record<GraphNode['kind'], string> = {
  person: '#2a78d6',
  fir: '#d9541e',
  phone: '#1b8a66',
  vehicle: '#7c5cd6',
  bank_account: '#c73535',
  station: '#8f8878',
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

  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; origin: Transform } | null>(
    null
  );
  const [isPanning, setIsPanning] = useState(false);

  const zoomBy = useCallback((factor: number) => {
    setTransform((current) => zoomAround(current, current.k * factor, WIDTH / 2, HEIGHT / 2));
  }, []);

  const resetView = useCallback(() => setTransform(IDENTITY), []);

  // Native non-passive wheel listener: React's onWheel is passive, so it
  // cannot preventDefault() — without this the browser zooms/scrolls the page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { x, y } = toViewBox(svg, event.clientX, event.clientY);
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setTransform((current) => zoomAround(current, current.k * factor, x, y));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) return;
      setHoveredId(null);
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: transform,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [transform]
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTransform({
      k: pan.origin.k,
      x: pan.origin.x + ((event.clientX - pan.startX) / rect.width) * WIDTH,
      y: pan.origin.y + ((event.clientY - pan.startY) / rect.height) * HEIGHT,
    });
  }, []);

  const endPan = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (panRef.current?.pointerId !== event.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
  }, []);

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
  const showAllLabels = nodes.length <= 30;

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
      <div className="relative overflow-hidden rounded-lg border border-[var(--border-1)] bg-[var(--surface-0)]">
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={transform.k >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-1)] bg-white text-lg font-semibold text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent)] disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            disabled={transform.k <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-1)] bg-white text-lg font-semibold text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent)] disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset view"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-1)] bg-white text-sm text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent)]"
          >
            ⟳
          </button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none select-none"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          role="img"
          aria-label="Criminal network graph — scroll to zoom, drag to pan"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
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
                stroke="#d8cfbc"
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
                  stroke="#fcfaf5"
                  strokeWidth={2}
                />
                {(showAllLabels || isRoot || node.kind === 'person' || hoveredId === node.id) && (
                  <text
                    x={node.x}
                    y={node.y - radius - 5}
                    textAnchor="middle"
                    fontSize={isRoot ? 12 : 10}
                    fontWeight={isRoot ? 700 : 400}
                    fill={isRoot ? '#1b1813' : '#57534a'}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
          </g>
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
          Hover a node to isolate its connections · scroll to zoom · drag to pan.
        </p>
      )}
    </div>
  );
}
