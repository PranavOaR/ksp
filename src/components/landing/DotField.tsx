'use client';

import { useMemo } from 'react';
import { createRng } from '@/lib/random';
import { DISTRICT_COORDS, DISTRICTS } from '@/lib/constants';

const SIZE = 560;
const CIRCLE_RADIUS = 252;
const DOT_STEP = 11;

// Karnataka bounding box for projecting district coordinates into the circle
const LAT_MIN = 11.6;
const LAT_MAX = 18.4;
const LON_MIN = 74.0;
const LON_MAX = 78.6;

function project(lat: number, lon: number): { x: number; y: number } {
  const nx = (lon - LON_MIN) / (LON_MAX - LON_MIN);
  const ny = 1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN);
  // Keep districts inside ~70% of the circle
  return {
    x: SIZE / 2 + (nx - 0.5) * CIRCLE_RADIUS * 1.4,
    y: SIZE / 2 + (ny - 0.5) * CIRCLE_RADIUS * 1.4,
  };
}

interface Hotspot {
  district: string;
  x: number;
  y: number;
  intensity: number;
  badge?: number;
}

/**
 * The dotted "globe" analog: a field of paper dots in a circle with orange
 * district hotspots for Karnataka. Deterministic (seeded) so SSR and client
 * render identically.
 */
export function DotField({ isActive }: { isActive: boolean }) {
  const dots = useMemo(() => {
    const rng = createRng(4242);
    const result: Array<{ x: number; y: number; opacity: number; r: number }> = [];
    for (let x = DOT_STEP / 2; x < SIZE; x += DOT_STEP) {
      for (let y = DOT_STEP / 2; y < SIZE; y += DOT_STEP) {
        const dx = x - SIZE / 2;
        const dy = y - SIZE / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > CIRCLE_RADIUS) continue;
        const edgeFade = 1 - distance / CIRCLE_RADIUS;
        result.push({
          x,
          y,
          r: rng.chance(0.12) ? 1.9 : 1.3,
          opacity: 0.14 + edgeFade * 0.22 + rng.next() * 0.1,
        });
      }
    }
    return result;
  }, []);

  const hotspots = useMemo<Hotspot[]>(() => {
    const rng = createRng(99);
    return DISTRICTS.map((district, index) => {
      const coords = DISTRICT_COORDS[district];
      const { x, y } = project(coords.lat, coords.lon);
      return {
        district,
        x,
        y,
        intensity: district === 'Bengaluru City' ? 1 : 0.35 + rng.next() * 0.45,
        badge: index === 4 ? 2 : index === 8 ? 3 : undefined,
      };
    });
  }, []);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full"
      role="img"
      aria-label="Dotted map of Karnataka with district crime hotspots"
    >
      {/* faint orbit rings, like the reference's dashed arcs */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={CIRCLE_RADIUS + 2}
        fill="none"
        stroke="rgba(224,90,28,0.25)"
        strokeWidth="1"
        strokeDasharray="2 7"
      />
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={`rgba(196, 118, 66, ${dot.opacity})`}
        />
      ))}
      {hotspots.map((hotspot) => {
        const radius = 5 + hotspot.intensity * 9;
        return (
          <g key={hotspot.district} opacity={isActive ? 1 : 0.25} style={{ transition: 'opacity .5s' }}>
            <circle
              cx={hotspot.x}
              cy={hotspot.y}
              r={radius + 6}
              fill="rgba(224,90,28,0.15)"
            />
            <circle cx={hotspot.x} cy={hotspot.y} r={radius} fill="#e05a1c" opacity={0.92} />
            <circle cx={hotspot.x} cy={hotspot.y} r={2.5} fill="#fff" />
            {hotspot.badge && isActive && (
              <g>
                <circle cx={hotspot.x + radius + 8} cy={hotspot.y - radius - 6} r={11} fill="#e05a1c" />
                <text
                  x={hotspot.x + radius + 8}
                  y={hotspot.y - radius - 2}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#fff"
                >
                  {hotspot.badge}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
