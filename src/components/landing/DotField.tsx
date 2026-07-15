'use client';

import { useMemo } from 'react';
import { createRng } from '@/lib/random';
import { DISTRICT_COORDS, DISTRICTS } from '@/lib/constants';
import { KARNATAKA_PATH, MAP_HEIGHT, MAP_WIDTH, projectGeo } from './karnatakaPath';

interface Hotspot {
  district: string;
  x: number;
  y: number;
  intensity: number;
  badge?: number;
}

/**
 * The landing hero visual: Karnataka's real boundary (GADM data, simplified)
 * with district crime hotspots projected from their true coordinates.
 * Deterministic (seeded) so SSR and client render identically.
 */
export function DotField({ isActive }: { isActive: boolean }) {
  const hotspots = useMemo<Hotspot[]>(() => {
    const rng = createRng(99);
    return DISTRICTS.map((district, index) => {
      const coords = DISTRICT_COORDS[district];
      const { x, y } = projectGeo(coords.lat, coords.lon);
      return {
        district,
        x,
        y,
        intensity: district === 'Bengaluru City' ? 1 : 0.3 + rng.next() * 0.45,
        badge:
          district === 'Bengaluru City' ? 3 : index === 4 ? 2 : index === 6 ? 1 : undefined,
      };
    });
  }, []);

  // A few small satellite dots near the busiest hotspots, like the reference
  const satellites = useMemo(() => {
    const rng = createRng(7);
    return hotspots.flatMap((hotspot) =>
      hotspot.intensity > 0.55
        ? [
            {
              x: hotspot.x + (rng.next() - 0.5) * 42,
              y: hotspot.y + (rng.next() - 0.5) * 42,
            },
          ]
        : []
    );
  }, [hotspots]);

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="mx-auto h-auto w-full max-w-[440px]"
      role="img"
      aria-label="Karnataka state map with district crime hotspots"
    >
      {/* State silhouette — real boundary */}
      <path
        d={KARNATAKA_PATH}
        fill="#efe3d6"
        stroke="#7d7668"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Satellite incident dots */}
      {satellites.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={3.5}
          fill="#c2410c"
          opacity={isActive ? 0.75 : 0.2}
          style={{ transition: 'opacity .5s' }}
        />
      ))}

      {/* District hotspots */}
      {hotspots.map((hotspot) => {
        const radius = 4.5 + hotspot.intensity * 9;
        return (
          <g
            key={hotspot.district}
            opacity={isActive ? 1 : 0.22}
            style={{ transition: 'opacity .5s' }}
          >
            <circle cx={hotspot.x} cy={hotspot.y} r={radius + 6} fill="rgba(224,90,28,0.16)" />
            <circle cx={hotspot.x} cy={hotspot.y} r={radius} fill="#e05a1c" opacity={0.92} />
            <circle cx={hotspot.x} cy={hotspot.y} r={2.2} fill="#fff" />
            {hotspot.badge && isActive && (
              <g>
                <circle
                  cx={hotspot.x + radius + 9}
                  cy={hotspot.y - radius - 6}
                  r={11}
                  fill="#c2410c"
                  stroke="#fcfaf5"
                  strokeWidth="2"
                />
                <text
                  x={hotspot.x + radius + 9}
                  y={hotspot.y - radius - 1.8}
                  textAnchor="middle"
                  fontSize="11"
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
