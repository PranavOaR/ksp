import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { forecastMonthly, type MonthlyPoint } from '@/lib/intel/forecast';
import { detectHotspots, type RegionCount } from '@/lib/intel/hotspots';

const FORECAST_HORIZON_MONTHS = 3;
const RECENT_WINDOW_START = '2026-04-01';
const PREVIOUS_WINDOW_START = '2026-01-01';

export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, roleFromRequest(request), 'view_analytics', 'analytics dashboard');

    const monthly = db
      .prepare(
        `SELECT substr(occurred_at, 1, 7) AS month, COUNT(*) AS count
         FROM firs GROUP BY month ORDER BY month`
      )
      .all() as MonthlyPoint[];

    const byCrimeType = db
      .prepare('SELECT crime_type AS name, COUNT(*) AS count FROM firs GROUP BY crime_type ORDER BY count DESC')
      .all() as Array<{ name: string; count: number }>;

    const byDistrict = db
      .prepare('SELECT district AS name, COUNT(*) AS count FROM firs GROUP BY district ORDER BY count DESC')
      .all() as Array<{ name: string; count: number }>;

    const byHour = db
      .prepare(
        `SELECT CAST(substr(occurred_at, 12, 2) AS INTEGER) AS hour, COUNT(*) AS count
         FROM firs GROUP BY hour ORDER BY hour`
      )
      .all() as Array<{ hour: number; count: number }>;

    const regionCounts = db
      .prepare(
        `SELECT district AS region,
                COUNT(*) AS total,
                SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS recent,
                SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous
         FROM firs GROUP BY district`
      )
      .all(RECENT_WINDOW_START, PREVIOUS_WINDOW_START, RECENT_WINDOW_START) as RegionCount[];

    const statusBreakdown = db
      .prepare('SELECT status AS name, COUNT(*) AS count FROM firs GROUP BY status')
      .all() as Array<{ name: string; count: number }>;

    return {
      monthlyWithForecast: forecastMonthly(monthly, FORECAST_HORIZON_MONTHS),
      byCrimeType,
      byDistrict,
      byHour,
      hotspots: detectHotspots(regionCounts),
      statusBreakdown,
    };
  });
}
