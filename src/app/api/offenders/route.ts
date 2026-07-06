import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { getOffenderProfiles } from '@/lib/intel/offenders';

export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb();
    logAudit(db, roleFromRequest(request), 'view_offenders', 'offender risk register');
    return { offenders: getOffenderProfiles(db) };
  });
}
