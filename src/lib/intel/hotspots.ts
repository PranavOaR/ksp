export interface RegionCount {
  region: string;
  /** Total incidents in the full analysis window. */
  total: number;
  /** Incidents in the most recent quarter of the window. */
  recent: number;
  /** Incidents in the quarter before that. */
  previous: number;
}

export interface Hotspot {
  region: string;
  total: number;
  intensity: number;
  growthPercent: number;
  isEmerging: boolean;
}

const EMERGING_GROWTH_THRESHOLD = 25;

/**
 * Hotspot detection (PRD C3): intensity is the region's share relative to the
 * busiest region; a hotspot is "emerging" when recent volume grew sharply
 * versus the prior period.
 */
export function detectHotspots(counts: readonly RegionCount[]): Hotspot[] {
  if (counts.length === 0) return [];
  const maxTotal = Math.max(...counts.map((count) => count.total), 1);

  return counts
    .map((count) => {
      const growthPercent =
        count.previous === 0
          ? count.recent > 0
            ? 100
            : 0
          : Math.round(((count.recent - count.previous) / count.previous) * 100);
      return {
        region: count.region,
        total: count.total,
        intensity: Math.round((count.total / maxTotal) * 100) / 100,
        growthPercent,
        isEmerging: growthPercent >= EMERGING_GROWTH_THRESHOLD && count.recent >= 3,
      };
    })
    .sort((a, b) => b.total - a.total);
}
