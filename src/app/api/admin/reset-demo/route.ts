import { fail, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { resetDemoData } from '@/lib/db/seed';

/** Restores the demo workspace to its pristine seeded state (Administrator only). */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  if (session.role !== 'Administrator') {
    return fail('Only Administrators can reset demo data.', 403);
  }

  return withErrorHandling(() => {
    const db = getDb('demo');
    resetDemoData(db);
    logAudit(db, session.role, 'reset_demo', `demo dataset reseeded by ${session.rank} ${session.name}`);
    return { reset: true };
  });
}
