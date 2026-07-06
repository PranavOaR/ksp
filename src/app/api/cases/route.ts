import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  return withErrorHandling(() => {
    const db = getDb();
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
