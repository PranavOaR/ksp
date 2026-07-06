import { describe, expect, test } from 'vitest';
import { detectCircularTransfers, type Transfer } from '@/lib/intel/financial';

function transfer(id: number, from: number, to: number, amount = 100_000): Transfer {
  return { id, fromAssetId: from, toAssetId: to, amount, occurredAt: '2026-01-01T00:00:00' };
}

describe('detectCircularTransfers (G3)', () => {
  test('finds a simple 3-account circular chain', () => {
    // Arrange: A→B→C→A
    const transfers = [transfer(1, 10, 20), transfer(2, 20, 30), transfer(3, 30, 10)];

    // Act
    const rings = detectCircularTransfers(transfers);

    // Assert
    expect(rings).toHaveLength(1);
    expect([...rings[0].accountIds].sort((a, b) => a - b)).toEqual([10, 20, 30]);
    expect(rings[0].totalAmount).toBe(300_000);
  });

  test('finds a 4-account layering ring', () => {
    const rings = detectCircularTransfers([
      transfer(1, 1, 2, 500_000),
      transfer(2, 2, 3, 490_000),
      transfer(3, 3, 4, 480_000),
      transfer(4, 4, 1, 470_000),
    ]);

    expect(rings).toHaveLength(1);
    expect(rings[0].accountIds).toHaveLength(4);
  });

  test('ignores two-party back-and-forth (not layering)', () => {
    const rings = detectCircularTransfers([transfer(1, 1, 2), transfer(2, 2, 1)]);

    expect(rings).toHaveLength(0);
  });

  test('linear chains without a cycle are not flagged', () => {
    const rings = detectCircularTransfers([
      transfer(1, 1, 2),
      transfer(2, 2, 3),
      transfer(3, 3, 4),
    ]);

    expect(rings).toHaveLength(0);
  });

  test('reports each distinct ring once even with duplicate transfers', () => {
    const rings = detectCircularTransfers([
      transfer(1, 10, 20),
      transfer(2, 20, 30),
      transfer(3, 30, 10),
      transfer(4, 10, 20), // duplicate leg
    ]);

    expect(rings).toHaveLength(1);
  });

  test('separates independent rings and ranks by volume', () => {
    const rings = detectCircularTransfers([
      transfer(1, 1, 2, 50_000),
      transfer(2, 2, 3, 50_000),
      transfer(3, 3, 1, 50_000),
      transfer(4, 7, 8, 900_000),
      transfer(5, 8, 9, 900_000),
      transfer(6, 9, 7, 900_000),
    ]);

    expect(rings).toHaveLength(2);
    expect(rings[0].totalAmount).toBe(2_700_000);
  });

  test('self-transfers are ignored', () => {
    const rings = detectCircularTransfers([transfer(1, 5, 5)]);

    expect(rings).toHaveLength(0);
  });
});
