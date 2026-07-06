import { fail, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { parseCsv, rowsToCaseInputs } from '@/lib/csv';
import { getDb } from '@/lib/db/client';
import { createCaseFile } from '@/lib/intel/createCase';
import { workspaceFromRequest } from '@/lib/workspace';

const MAX_CSV_BYTES = 1_000_000;
const MAX_ROWS = 2000;

/** Bulk CSV import of case files (Supervisor/Administrator, PRD real-data onboarding). */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) {
    return fail('Sign in required.', 401);
  }
  if (session.role !== 'Supervisor' && session.role !== 'Administrator') {
    return fail('CSV import requires Supervisor or Administrator role.', 403);
  }

  const text = await request.text().catch(() => '');
  if (!text.trim()) return fail('Empty CSV body.');
  if (text.length > MAX_CSV_BYTES) return fail('CSV exceeds 1 MB.');

  const rows = parseCsv(text);
  if (rows.length - 1 > MAX_ROWS) return fail(`CSV exceeds ${MAX_ROWS} rows.`);

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    const results = rowsToCaseInputs(rows);
    const rejected: Array<{ row: number; reason: string }> = [];
    let imported = 0;

    for (const result of results) {
      if (!result.ok || !result.input) {
        rejected.push({ row: result.rowNumber, reason: result.error ?? 'invalid' });
        continue;
      }
      try {
        createCaseFile(db, result.input);
        imported += 1;
      } catch (error) {
        rejected.push({
          row: result.rowNumber,
          reason: error instanceof Error ? error.message : 'insert failed',
        });
      }
    }

    logAudit(
      db,
      session.role,
      'import_csv',
      `${imported} imported, ${rejected.length} rejected by ${session.rank} ${session.name}`
    );
    return { imported, rejected };
  });
}
