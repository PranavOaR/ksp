import { fail, withErrorHandling } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { detectCrimeRings } from '@/lib/intel/gangs';
import { buildNetwork } from '@/lib/intel/network';
import { getCoAccusedPairs } from '@/lib/intel/offenders';

const MAX_HOPS = 3;

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  const url = new URL(request.url);
  const personIdParam = url.searchParams.get('personId');
  const hopsParam = url.searchParams.get('hops') ?? '2';

  const hops = Number(hopsParam);
  if (!Number.isInteger(hops) || hops < 1 || hops > MAX_HOPS) {
    return fail(`"hops" must be an integer between 1 and ${MAX_HOPS}.`);
  }

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    const role = session.role;

    if (personIdParam) {
      const personId = Number(personIdParam);
      if (!Number.isInteger(personId) || personId <= 0) {
        throw new Error('Invalid personId');
      }
      logAudit(db, role, 'explore_network', `person ${personId}, ${hops} hops`);
      return { graph: buildNetwork(db, personId, hops), rings: [] };
    }

    // No person selected: return detected organized-crime rings for the picker
    const rings = detectCrimeRings(getCoAccusedPairs(db));
    const nameStmt = db.prepare('SELECT name FROM persons WHERE id = ?');
    const enriched = rings.map((ring) => ({
      ...ring,
      memberNames: ring.members.map(
        (id) => (nameStmt.get(id) as { name: string } | undefined)?.name ?? `Person ${id}`
      ),
    }));
    logAudit(db, role, 'view_crime_rings', `${enriched.length} rings`);
    return { graph: { nodes: [], edges: [] }, rings: enriched };
  });
}
