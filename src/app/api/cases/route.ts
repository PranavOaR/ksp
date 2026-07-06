import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { CaseInputSchema, createCaseFile } from '@/lib/intel/createCase';
import { workspaceFromRequest } from '@/lib/workspace';

const PAGE_SIZE = 30;

/** Create a real case file (authenticated officers only). */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) {
    return fail('Sign in required to create case files.', 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = CaseInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${issue.path.join('.')}: ${issue.message}`);
  }

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    const created = createCaseFile(db, parsed.data);
    logAudit(
      db,
      session.role,
      'create_case',
      `${created.firNumber} (${parsed.data.crimeType}, ${parsed.data.district}) by ${session.rank} ${session.name}`
    );
    return created;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, roleFromRequest(request), 'list_cases', `page ${page}`);

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM firs').get() as { total: number };
    const cases = db
      .prepare(
        `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
                f.occurred_at, f.status
         FROM firs f JOIN stations s ON s.id = f.station_id
         ORDER BY f.occurred_at DESC LIMIT ? OFFSET ?`
      )
      .all(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    return { cases, meta: { total, page, limit: PAGE_SIZE } };
  });
}
