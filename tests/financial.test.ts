import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';
import {
  buildMoneyTrail,
  detectCircularTransfers,
  HIGH_VALUE_THRESHOLD,
  type Transfer,
} from '@/lib/intel/financial';

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

describe('buildMoneyTrail on seeded data (G1, G2)', () => {
  let db: Database;

  beforeAll(() => {
    // Arrange (shared): full synthetic dataset in an in-memory database
    db = new DatabaseConstructor(':memory:');
    db.exec(SCHEMA_SQL);
    seedDatabase(db);
  });

  afterAll(() => {
    db.close();
  });

  test('recovers the seeded circular transfer rings', () => {
    const trail = buildMoneyTrail(db);

    expect(trail.rings.length).toBeGreaterThan(0);
    for (const ring of trail.rings) {
      expect(ring.accounts.length).toBeGreaterThanOrEqual(3);
      expect(ring.totalAmount).toBeGreaterThan(0);
    }
  });

  test('every ring account resolves to its real database identifier and owner', () => {
    const trail = buildMoneyTrail(db);

    for (const ring of trail.rings) {
      for (const account of ring.accounts) {
        const row = db
          .prepare(`SELECT identifier FROM assets WHERE id = ?`)
          .get(account.assetId) as { identifier: string } | undefined;
        expect(row).toBeDefined();
        expect(account.identifier).toBe(row!.identifier);
        expect(account.ownerName).not.toBe('Unknown');
      }
    }
  });

  test('high-value transfers are above the threshold, capped at 20, sorted desc', () => {
    const trail = buildMoneyTrail(db);

    expect(trail.highValueTransfers.length).toBeGreaterThan(0);
    expect(trail.highValueTransfers.length).toBeLessThanOrEqual(20);
    for (const item of trail.highValueTransfers) {
      expect(item.amount).toBeGreaterThanOrEqual(HIGH_VALUE_THRESHOLD);
    }
    const amounts = trail.highValueTransfers.map((item) => item.amount);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
  });

  test('graph nodes are bank accounts and every edge endpoint exists', () => {
    const trail = buildMoneyTrail(db);

    expect(trail.graph.nodes.length).toBeGreaterThan(0);
    const nodeIds = new Set(trail.graph.nodes.map((node) => node.id));
    for (const node of trail.graph.nodes) {
      expect(node.kind).toBe('bank_account');
    }
    for (const edge of trail.graph.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  test('ring members are marked hop 0 in the graph', () => {
    const trail = buildMoneyTrail(db);
    const ringAssetIds = new Set(
      trail.rings.flatMap((ring) => ring.accounts.map((account) => `a:${account.assetId}`))
    );

    const ringNodes = trail.graph.nodes.filter((node) => ringAssetIds.has(node.id));
    expect(ringNodes.length).toBeGreaterThan(0);
    for (const node of ringNodes) {
      expect(node.hop).toBe(0);
    }
  });

  test('stats reconcile with the underlying data', () => {
    const trail = buildMoneyTrail(db);

    expect(trail.stats.accountCount).toBeGreaterThan(0);
    expect(trail.stats.transferCount).toBeGreaterThan(0);
    const ringVolume = trail.rings.reduce((sum, ring) => sum + ring.totalAmount, 0);
    expect(trail.stats.flaggedVolume).toBe(ringVolume);
  });

  test('empty database yields empty trail without crashing', () => {
    const emptyDb = new DatabaseConstructor(':memory:');
    emptyDb.exec(SCHEMA_SQL);

    const trail = buildMoneyTrail(emptyDb);

    expect(trail.rings).toHaveLength(0);
    expect(trail.graph.nodes).toHaveLength(0);
    expect(trail.highValueTransfers).toHaveLength(0);
    expect(trail.stats.flaggedVolume).toBe(0);
    emptyDb.close();
  });
});
