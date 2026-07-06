import { describe, expect, test } from 'vitest';
import { detectHotspots } from '@/lib/intel/hotspots';

describe('detectHotspots (C3)', () => {
  test('ranks regions by total incidents with normalized intensity', () => {
    // Arrange
    const counts = [
      { region: 'Mysuru', total: 50, recent: 10, previous: 10 },
      { region: 'Bengaluru City', total: 100, recent: 30, previous: 20 },
    ];

    // Act
    const hotspots = detectHotspots(counts);

    // Assert
    expect(hotspots[0].region).toBe('Bengaluru City');
    expect(hotspots[0].intensity).toBe(1);
    expect(hotspots[1].intensity).toBe(0.5);
  });

  test('flags a region as emerging when recent growth exceeds threshold', () => {
    const hotspots = detectHotspots([
      { region: 'Ballari', total: 20, recent: 10, previous: 4 },
      { region: 'Mysuru', total: 40, recent: 5, previous: 5 },
    ]);

    const ballari = hotspots.find((hotspot) => hotspot.region === 'Ballari');
    const mysuru = hotspots.find((hotspot) => hotspot.region === 'Mysuru');
    expect(ballari?.isEmerging).toBe(true);
    expect(mysuru?.isEmerging).toBe(false);
  });

  test('handles zero previous-period counts without dividing by zero', () => {
    const hotspots = detectHotspots([{ region: 'Tumakuru', total: 5, recent: 5, previous: 0 }]);

    expect(hotspots[0].growthPercent).toBe(100);
  });

  test('returns empty array for empty input', () => {
    expect(detectHotspots([])).toEqual([]);
  });
});
