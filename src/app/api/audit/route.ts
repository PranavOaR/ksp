import { withErrorHandling } from '@/lib/api';
import { getAuditLog } from '@/lib/audit';
import { getDb } from '@/lib/db/client';

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();
    return { entries: getAuditLog(db) };
  });
}
