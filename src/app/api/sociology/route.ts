import { fail, withErrorHandling } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { CENSUS_DATA } from '@/lib/data/census';
import { correlateCrimeWithCensus } from '@/lib/intel/sociology';

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, session.role, 'view_sociology', 'sociological intelligence module (D)');

    const districtCrimeCounts = db
      .prepare(`SELECT district, COUNT(*) AS crimeCount FROM firs GROUP BY district`)
      .all() as Array<{ district: string; crimeCount: number }>;

    return correlateCrimeWithCensus(districtCrimeCounts, CENSUS_DATA);
  });
}
