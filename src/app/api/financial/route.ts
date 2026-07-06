import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { buildMoneyTrail } from '@/lib/intel/financial';

export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb();
    logAudit(db, roleFromRequest(request), 'view_financial', 'money trail analysis');
    return buildMoneyTrail(db);
  });
}
