import { fail, withErrorHandling } from '@/lib/api';
import { canAccess, sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { buildMoneyTrail } from '@/lib/intel/financial';

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  // Mirrors the /financial page restriction (ROLE_ACCESS)
  if (!canAccess('/financial', session.role)) {
    return fail('Financial intelligence requires Analyst, Supervisor or Administrator role.', 403);
  }
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, session.role, 'view_financial', 'money trail analysis');
    return buildMoneyTrail(db);
  });
}
