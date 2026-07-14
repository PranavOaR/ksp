import { fail, withErrorHandling } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { getOffenderProfiles } from '@/lib/intel/offenders';

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, session.role, 'view_offenders', 'offender risk register');
    return { offenders: getOffenderProfiles(db) };
  });
}
