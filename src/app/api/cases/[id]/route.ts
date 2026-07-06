import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { buildCaseIntelligence } from '@/lib/intel/caseIntel';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const firId = Number(id);
  if (!Number.isInteger(firId) || firId <= 0) {
    return fail('Case id must be a positive integer.');
  }

  return withErrorHandling(() => {
    const db = getDb();
    const intelligence = buildCaseIntelligence(db, firId);
    if (!intelligence) {
      throw new Error(`Case ${firId} not found`);
    }
    logAudit(db, roleFromRequest(request), 'view_case', intelligence.fir.fir_number);
    return intelligence;
  });
}
