import { fail, withErrorHandling } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { forecastMonthly, type MonthlyPoint } from '@/lib/intel/forecast';
import { detectHotspots, type RegionCount } from '@/lib/intel/hotspots';
import { clusterByMO } from '@/lib/intel/moClusters';

const FORECAST_HORIZON_MONTHS = 3;

/**
 * Derives "recent" and "previous" quarter start dates relative to the latest
 * record in the active workspace, so hotspot windows are always live-data-relative
 * instead of pinned to the synthetic demo calendar (A1 fix).
 */
function deriveQuarterWindows(maxDate: string): { recentStart: string; previousStart: string } {
  const d = new Date(maxDate);
  // recent = 3 months before maxDate
  const recent = new Date(d);
  recent.setMonth(recent.getMonth() - 3);
  // previous = 6 months before maxDate
  const previous = new Date(d);
  previous.setMonth(previous.getMonth() - 6);
  const fmt = (date: Date) => date.toISOString().slice(0, 10);
  return { recentStart: fmt(recent), previousStart: fmt(previous) };
}

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, session.role, 'view_analytics', 'analytics dashboard');

    // A1: derive quarter windows from actual data, not hard-coded dates
    const { maxDate } = db
      .prepare(`SELECT COALESCE(MAX(occurred_at), datetime('now')) AS maxDate FROM firs`)
      .get() as { maxDate: string };
    const { recentStart, previousStart } = deriveQuarterWindows(maxDate);

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
      .all(recentStart, previousStart, recentStart) as RegionCount[];

    const statusBreakdown = db
      .prepare('SELECT status AS name, COUNT(*) AS count FROM firs GROUP BY status')
      .all() as Array<{ name: string; count: number }>;

    // A3: MO clusters — groups of 2+ FIRs sharing identical modus operandi
    const moRows = db
      .prepare(
        `SELECT id, modus_operandi FROM firs ORDER BY occurred_at DESC`
      )
      .all() as Array<{ id: number; modus_operandi: string }>;
    const moClusters = clusterByMO(moRows);

    return {
      monthlyWithForecast: forecastMonthly(monthly, FORECAST_HORIZON_MONTHS),
      byCrimeType,
      byDistrict,
      byHour,
      hotspots: detectHotspots(regionCounts),
      statusBreakdown,
      moClusters,
    };
  });
}
