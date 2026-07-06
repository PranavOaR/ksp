export interface CoAccusedPair {
  a: number;
  b: number;
  timesTogether: number;
}

export interface CrimeRing {
  members: number[];
  collaborationCount: number;
}

const MIN_COLLABORATIONS = 2;
const MIN_RING_SIZE = 3;

/**
 * Organized crime detection (PRD B2): clusters people who are repeatedly
 * co-accused using union-find over strong co-offending pairs.
 */
export function detectCrimeRings(pairs: readonly CoAccusedPair[]): CrimeRing[] {
  const strongPairs = pairs.filter((pair) => pair.timesTogether >= MIN_COLLABORATIONS);
  const parent = new Map<number, number>();

  const find = (node: number): number => {
    const parentOf = parent.get(node) ?? node;
    if (parentOf === node) return node;
    const root = find(parentOf);
    parent.set(node, root);
    return root;
  };
  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  for (const pair of strongPairs) {
    if (!parent.has(pair.a)) parent.set(pair.a, pair.a);
    if (!parent.has(pair.b)) parent.set(pair.b, pair.b);
    union(pair.a, pair.b);
  }

  const clusters = new Map<number, Set<number>>();
  const collaborations = new Map<number, number>();
  for (const pair of strongPairs) {
    const root = find(pair.a);
    const cluster = clusters.get(root) ?? new Set<number>();
    cluster.add(pair.a);
    cluster.add(pair.b);
    clusters.set(root, cluster);
    collaborations.set(root, (collaborations.get(root) ?? 0) + pair.timesTogether);
  }

  return [...clusters.entries()]
    .filter(([, members]) => members.size >= MIN_RING_SIZE)
    .map(([root, members]) => ({
      members: [...members].sort((a, b) => a - b),
      collaborationCount: collaborations.get(root) ?? 0,
    }))
    .sort((a, b) => b.collaborationCount - a.collaborationCount);
}
