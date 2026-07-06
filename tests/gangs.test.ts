import { describe, expect, test } from 'vitest';
import { detectCrimeRings } from '@/lib/intel/gangs';

describe('detectCrimeRings (B2)', () => {
  test('clusters transitively connected co-offenders into one ring', () => {
    // Arrange: 1-2, 2-3 and 3-4 repeatedly co-accused → one ring of 4
    const pairs = [
      { a: 1, b: 2, timesTogether: 3 },
      { a: 2, b: 3, timesTogether: 2 },
      { a: 3, b: 4, timesTogether: 2 },
    ];

    // Act
    const rings = detectCrimeRings(pairs);

    // Assert
    expect(rings).toHaveLength(1);
    expect(rings[0].members).toEqual([1, 2, 3, 4]);
  });

  test('ignores one-off collaborations below the threshold', () => {
    const rings = detectCrimeRings([
      { a: 1, b: 2, timesTogether: 1 },
      { a: 2, b: 3, timesTogether: 1 },
    ]);

    expect(rings).toHaveLength(0);
  });

  test('separates unconnected rings and ranks by collaboration strength', () => {
    const rings = detectCrimeRings([
      { a: 1, b: 2, timesTogether: 2 },
      { a: 2, b: 3, timesTogether: 2 },
      { a: 10, b: 11, timesTogether: 5 },
      { a: 11, b: 12, timesTogether: 5 },
    ]);

    expect(rings).toHaveLength(2);
    expect(rings[0].members).toEqual([10, 11, 12]);
  });

  test('a pair alone is not a ring (minimum size 3)', () => {
    const rings = detectCrimeRings([{ a: 5, b: 6, timesTogether: 9 }]);

    expect(rings).toHaveLength(0);
  });
});
