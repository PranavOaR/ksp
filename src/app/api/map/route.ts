import { roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { DISTRICT_COORDS, type District } from '@/lib/constants';
import { detectHotspots, type RegionCount } from '@/lib/intel/hotspots';
import { forecastMonthly, type MonthlyPoint } from '@/lib/intel/forecast';

export interface MapPoint {
  lat: number;
  lon: number;
  crimeType: string;
  district: string;
}

export interface DistrictForecast {
  district: string;
  lat: number;
  lon: number;
  /** Cases in the last 3 observed months. */
  recentQuarter: number;
  /** Predicted cases over the next 3 months (least-squares, Module H). */
  predictedQuarter: number;
  growthPercent: number;
}

const FORECAST_HORIZON_MONTHS = 3;

/**
 * Geographic intelligence feed (C3/H3): raw incident points for the density
 * layer, district hotspots with coordinates, and a per-district 3-month
 * forecast for the predictive overlay the judges asked for.
 */
export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, roleFromRequest(request), 'view_map', 'crime density map');

    const points = db
      .prepare('SELECT lat, lon, crime_type AS crimeType, district FROM firs')
      .all() as MapPoint[];

    const { maxDate } = db
      .prepare(`SELECT COALESCE(MAX(occurred_at), datetime('now')) AS maxDate FROM firs`)
      .get() as { maxDate: string };
    const max = new Date(maxDate);
    const recent = new Date(max);
    recent.setMonth(recent.getMonth() - 3);
    const previous = new Date(max);
    previous.setMonth(previous.getMonth() - 6);

    const regionCounts = db
      .prepare(
        `SELECT district AS region,
                COUNT(*) AS total,
                SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS recent,
                SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous
         FROM firs GROUP BY district`
      )
      .all(
        recent.toISOString().slice(0, 10),
        previous.toISOString().slice(0, 10),
        recent.toISOString().slice(0, 10)
      ) as RegionCount[];
    const hotspots = detectHotspots(regionCounts).map((hotspot) => ({
      ...hotspot,
      lat: DISTRICT_COORDS[hotspot.region as District]?.lat ?? null,
      lon: DISTRICT_COORDS[hotspot.region as District]?.lon ?? null,
    }));

    const monthlyByDistrict = db
      .prepare(
        `SELECT district, substr(occurred_at, 1, 7) AS month, COUNT(*) AS count
         FROM firs GROUP BY district, month ORDER BY month`
      )
      .all() as Array<{ district: string; month: string; count: number }>;
    const historyByDistrict = new Map<string, MonthlyPoint[]>();
    for (const row of monthlyByDistrict) {
      const history = historyByDistrict.get(row.district) ?? [];
      history.push({ month: row.month, count: row.count });
      historyByDistrict.set(row.district, history);
    }

    const forecasts: DistrictForecast[] = [];
    for (const [district, history] of historyByDistrict) {
      const coords = DISTRICT_COORDS[district as District];
      if (!coords || history.length < 4) continue;
      const withForecast = forecastMonthly(history, FORECAST_HORIZON_MONTHS);
      const predicted = withForecast
        .filter((point) => point.isForecast)
        .reduce((sum, point) => sum + point.count, 0);
      const recentQuarter = history
        .slice(-FORECAST_HORIZON_MONTHS)
        .reduce((sum, point) => sum + point.count, 0);
      forecasts.push({
        district,
        lat: coords.lat,
        lon: coords.lon,
        recentQuarter,
        predictedQuarter: predicted,
        growthPercent:
          recentQuarter > 0 ? Math.round(((predicted - recentQuarter) / recentQuarter) * 100) : 0,
      });
    }
    forecasts.sort((a, b) => b.predictedQuarter - a.predictedQuarter);

    return { points, hotspots, forecasts };
  });
}
