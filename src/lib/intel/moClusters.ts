/**
 * Modus operandi clustering (PRD C4): groups FIRs that share an identical
 * modus_operandi string into "serial pattern" clusters. Only clusters with
 * ≥ 2 cases are returned — single-case MOs are never flagged.
 */

export interface MOCluster {
  /** The exact modus operandi string shared by the cluster members. */
  mo: string;
  /** Number of FIRs in this cluster (always ≥ 2). */
  count: number;
  /** IDs of the FIRs that share this MO. */
  firIds: number[];
}

/**
 * Clusters a list of FIR stubs by modus_operandi.
 * Returns clusters with ≥ 2 members, sorted descending by count.
 */
export function clusterByMO(
  firs: ReadonlyArray<{ id: number; modus_operandi: string }>
): MOCluster[] {
  const map = new Map<string, number[]>();
  for (const fir of firs) {
    const key = fir.modus_operandi.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(fir.id);
  }
  return Array.from(map.entries())
    .filter(([, ids]) => ids.length >= 2)
    .map(([mo, ids]) => ({ mo, count: ids.length, firIds: ids }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Checks whether a specific FIR belongs to a serial MO cluster.
 * Returns the cluster details if found, otherwise returns null.
 */
export function findMOCluster(
  firId: number,
  clusters: MOCluster[]
): MOCluster | null {
  return clusters.find((cluster) => cluster.firIds.includes(firId)) ?? null;
}
