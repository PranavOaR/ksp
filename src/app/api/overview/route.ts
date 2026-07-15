import { fail, withErrorHandling } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { detectCrimeRings } from '@/lib/intel/gangs';
import { detectHotspots, type RegionCount } from '@/lib/intel/hotspots';
import { getCoAccusedPairs, getOffenderProfiles } from '@/lib/intel/offenders';

/**
 * Derives "recent" and "previous" quarter start dates relative to the latest
 * record in the active workspace, so hotspot windows are always live-data-relative
 * instead of pinned to the synthetic demo calendar (A1 fix).
 */
function deriveQuarterWindows(maxDate: string): { recentStart: string; previousStart: string } {
  const d = new Date(maxDate);
  const recent = new Date(d);
  recent.setMonth(recent.getMonth() - 3);
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
    logAudit(db, session.role, 'view_overview', 'command dashboard');

    const totals = db
      .prepare(
        `SELECT COUNT(*) AS totalFirs,
                SUM(CASE WHEN status = 'Solved' THEN 1 ELSE 0 END) AS solved
         FROM firs`
      )
      .get() as { totalFirs: number; solved: number };

    // A1: derive quarter windows and offender "now" from actual data
    const { maxDate } = db
      .prepare(`SELECT COALESCE(MAX(occurred_at), datetime('now')) AS maxDate FROM firs`)
      .get() as { maxDate: string };
    const { recentStart, previousStart } = deriveQuarterWindows(maxDate);
    const datasetNow = maxDate.slice(0, 10);

    // Pass the live dataset's end date as "now" so recency scores are meaningful
    const offenders = getOffenderProfiles(db, 2, datasetNow);
    const rings = detectCrimeRings(getCoAccusedPairs(db));

    const regionCounts = db
      .prepare(
        `SELECT district AS region,
                COUNT(*) AS total,
                SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS recent,
                SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous
         FROM firs GROUP BY district`
      )
      .all(recentStart, previousStart, recentStart) as RegionCount[];
    const emerging = detectHotspots(regionCounts).filter((hotspot) => hotspot.isEmerging);

    const recentFirs = db
      .prepare(
        `SELECT f.id, f.fir_number, f.crime_type, f.district, f.occurred_at, f.status
         FROM firs f ORDER BY f.occurred_at DESC LIMIT 8`
      )
      .all();

    return {
      kpis: {
        totalFirs: totals.totalFirs,
        solvedRate: Math.round((totals.solved / Math.max(totals.totalFirs, 1)) * 100),
        repeatOffenders: offenders.length,
        highRiskOffenders: offenders.filter((offender) => offender.riskCategory === 'High').length,
        crimeRings: rings.length,
      },
      alerts: emerging.map((hotspot) => ({
        district: hotspot.region,
        growthPercent: hotspot.growthPercent,
        message: `${hotspot.region}: incident volume up ${hotspot.growthPercent}% this quarter — emerging hotspot`,
      })),
      recentFirs,
    };
  });
}
