import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { detectCrimeRings } from '@/lib/intel/gangs';
import { detectHotspots, type RegionCount } from '@/lib/intel/hotspots';
import { getCoAccusedPairs, getOffenderProfiles } from '@/lib/intel/offenders';

const RECENT_WINDOW_START = '2026-04-01';
const PREVIOUS_WINDOW_START = '2026-01-01';

export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb();
    logAudit(db, roleFromRequest(request), 'view_overview', 'command dashboard');

    const totals = db
      .prepare(
        `SELECT COUNT(*) AS totalFirs,
                SUM(CASE WHEN status = 'Solved' THEN 1 ELSE 0 END) AS solved
         FROM firs`
      )
      .get() as { totalFirs: number; solved: number };

    const offenders = getOffenderProfiles(db);
    const rings = detectCrimeRings(getCoAccusedPairs(db));

    const regionCounts = db
      .prepare(
        `SELECT district AS region,
                COUNT(*) AS total,
                SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS recent,
                SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous
         FROM firs GROUP BY district`
      )
      .all(RECENT_WINDOW_START, PREVIOUS_WINDOW_START, RECENT_WINDOW_START) as RegionCount[];
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
