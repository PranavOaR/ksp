import type { Database } from 'better-sqlite3';
import type { GraphEdge, GraphNode, NetworkGraph } from './types';

export interface Transfer {
  id: number;
  fromAssetId: number;
  toAssetId: number;
  amount: number;
  occurredAt: string;
}

export interface TransferRing {
  /** Asset ids of the accounts in cycle order. */
  accountIds: number[];
  totalAmount: number;
}

const MAX_CYCLE_LENGTH = 6;
export const HIGH_VALUE_THRESHOLD = 100_000;

/**
 * Suspicious network detection (PRD G3): finds circular transfer chains
 * (A→B→C→A), the classic layering pattern in money laundering.
 * Pure function — DFS over the directed transfer graph, deduplicated by
 * canonical cycle signature.
 */
export function detectCircularTransfers(transfers: readonly Transfer[]): TransferRing[] {
  const adjacency = new Map<number, Transfer[]>();
  for (const transfer of transfers) {
    if (transfer.fromAssetId === transfer.toAssetId) continue;
    const outgoing = adjacency.get(transfer.fromAssetId) ?? [];
    outgoing.push(transfer);
    adjacency.set(transfer.fromAssetId, outgoing);
  }

  const rings: TransferRing[] = [];
  const seenSignatures = new Set<string>();

  const walk = (start: number, current: number, path: number[], amountSum: number): void => {
    const outgoing = adjacency.get(current) ?? [];
    for (const transfer of outgoing) {
      const next = transfer.toAssetId;
      if (next === start && path.length >= 3) {
        const signature = [...path].sort((a, b) => a - b).join('-');
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          rings.push({ accountIds: [...path], totalAmount: amountSum + transfer.amount });
        }
        continue;
      }
      // Only continue through unvisited nodes greater than start (canonical form)
      if (next > start && !path.includes(next) && path.length < MAX_CYCLE_LENGTH) {
        walk(start, next, [...path, next], amountSum + transfer.amount);
      }
    }
  };

  for (const start of [...adjacency.keys()].sort((a, b) => a - b)) {
    walk(start, start, [start], 0);
  }

  return rings.sort((a, b) => b.totalAmount - a.totalAmount);
}

interface AccountRow {
  id: number;
  identifier: string;
  ownerName: string | null;
}

export interface MoneyTrailData {
  graph: NetworkGraph;
  rings: Array<{
    accounts: Array<{ assetId: number; identifier: string; ownerName: string }>;
    totalAmount: number;
  }>;
  highValueTransfers: Array<{
    from: string;
    fromOwner: string;
    to: string;
    toOwner: string;
    amount: number;
    occurredAt: string;
  }>;
  stats: { accountCount: number; transferCount: number; flaggedVolume: number };
}

/** Transaction link analysis + money trail graph (PRD G1, G2). */
export function buildMoneyTrail(db: Database): MoneyTrailData {
  const transfers = db
    .prepare(
      `SELECT id, from_asset_id AS fromAssetId, to_asset_id AS toAssetId,
              amount, occurred_at AS occurredAt
       FROM transactions`
    )
    .all() as Transfer[];

  const accounts = db
    .prepare(
      `SELECT a.id, a.identifier, p.name AS ownerName
       FROM assets a LEFT JOIN persons p ON p.id = a.owner_person_id
       WHERE a.type = 'bank_account'`
    )
    .all() as AccountRow[];
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const rings = detectCircularTransfers(transfers);
  const ringAccountIds = new Set(rings.flatMap((ring) => ring.accountIds));

  // Graph limited to accounts that move meaningful money (keeps the picture readable)
  const activeIds = new Set<number>();
  for (const transfer of transfers) {
    if (transfer.amount >= HIGH_VALUE_THRESHOLD / 2 || ringAccountIds.has(transfer.fromAssetId)) {
      activeIds.add(transfer.fromAssetId);
      activeIds.add(transfer.toAssetId);
    }
  }

  const nodes: GraphNode[] = [...activeIds]
    .map((assetId): GraphNode | null => {
      const account = accountById.get(assetId);
      if (!account) return null;
      return {
        id: `a:${assetId}`,
        label: account.ownerName ? `${account.ownerName}` : account.identifier,
        kind: 'bank_account',
        hop: ringAccountIds.has(assetId) ? 0 : 1,
      };
    })
    .filter((node): node is GraphNode => node !== null);

  const edges: GraphEdge[] = transfers
    .filter((transfer) => activeIds.has(transfer.fromAssetId) && activeIds.has(transfer.toAssetId))
    .map((transfer) => ({
      source: `a:${transfer.fromAssetId}`,
      target: `a:${transfer.toAssetId}`,
      relation: `₹${Math.round(transfer.amount).toLocaleString('en-IN')}`,
    }));

  const highValueTransfers = transfers
    .filter((transfer) => transfer.amount >= HIGH_VALUE_THRESHOLD)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)
    .map((transfer) => {
      const from = accountById.get(transfer.fromAssetId);
      const to = accountById.get(transfer.toAssetId);
      return {
        from: from?.identifier ?? `AC${transfer.fromAssetId}`,
        fromOwner: from?.ownerName ?? 'Unknown',
        to: to?.identifier ?? `AC${transfer.toAssetId}`,
        toOwner: to?.ownerName ?? 'Unknown',
        amount: transfer.amount,
        occurredAt: transfer.occurredAt,
      };
    });

  return {
    graph: { nodes, edges },
    rings: rings.map((ring) => ({
      accounts: ring.accountIds.map((assetId) => {
        const account = accountById.get(assetId);
        return {
          assetId,
          identifier: account?.identifier ?? `AC${assetId}`,
          ownerName: account?.ownerName ?? 'Unknown',
        };
      }),
      totalAmount: ring.totalAmount,
    })),
    highValueTransfers,
    stats: {
      accountCount: accounts.length,
      transferCount: transfers.length,
      flaggedVolume: rings.reduce((sum, ring) => sum + ring.totalAmount, 0),
    },
  };
}
