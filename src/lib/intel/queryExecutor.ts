import type { Database } from 'better-sqlite3';
import { getOffenderProfiles } from './offenders';
import type { FirRecord, OffenderProfile, QueryFilter } from './types';

const FIR_RESULT_LIMIT = 25;

export interface QueryResult {
  kind: 'firs' | 'offenders' | 'count';
  firs: FirRecord[];
  offenders: OffenderProfile[];
  totalCount: number;
  /** FIR numbers backing the answer — evidence references (PRD I1). */
  evidence: string[];
  summary: string;
}

function buildWhere(filter: QueryFilter): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.crimeType) {
    conditions.push('f.crime_type = ?');
    params.push(filter.crimeType);
  }
  if (filter.district) {
    conditions.push('f.district = ?');
    params.push(filter.district);
  }
  if (filter.status) {
    conditions.push('f.status = ?');
    params.push(filter.status);
  }
  if (filter.fromDate) {
    conditions.push('f.occurred_at >= ?');
    params.push(filter.fromDate);
  }
  if (filter.toDate) {
    conditions.push('f.occurred_at <= ?');
    params.push(`${filter.toDate}T23:59:59`);
  }
  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function describeFilter(filter: QueryFilter, totalCount: number): string {
  const parts = [
    filter.crimeType ?? 'crime',
    'cases',
    filter.district ? `in ${filter.district}` : 'across Karnataka',
    filter.status ? `with status "${filter.status}"` : '',
    filter.fromDate ? `between ${filter.fromDate} and ${filter.toDate ?? 'now'}` : '',
  ].filter(Boolean);
  return `Found ${totalCount} ${parts.join(' ')}.`;
}

/** Executes a structured filter against the FIR database (PRD A1). */
export function executeQuery(db: Database, filter: QueryFilter): QueryResult {
  if (filter.intent === 'listOffenders') {
    const all = getOffenderProfiles(db);
    const offenders = all
      .filter((offender) =>
        filter.crimeType ? offender.crimeTypes.includes(filter.crimeType) : true
      )
      .filter((offender) => (filter.district ? offender.district === filter.district : true))
      .slice(0, 20);
    return {
      kind: 'offenders',
      firs: [],
      offenders,
      totalCount: offenders.length,
      evidence: offenders.map((offender) => `${offender.caseCount} FIRs vs ${offender.name}`),
      summary: `Identified ${offenders.length} repeat offenders${
        filter.crimeType ? ` involved in ${filter.crimeType}` : ''
      }${filter.district ? ` operating in ${filter.district}` : ''}, ranked by case count.`,
    };
  }

  const { clause, params } = buildWhere(filter);
  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM firs f ${clause}`)
    .get(...params) as { total: number };

  const firs =
    filter.intent === 'count'
      ? []
      : (db
          .prepare(
            `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
                    f.description, f.modus_operandi, f.occurred_at, f.status
             FROM firs f JOIN stations s ON s.id = f.station_id
             ${clause} ORDER BY f.occurred_at DESC LIMIT ${FIR_RESULT_LIMIT}`
          )
          .all(...params) as FirRecord[]);

  return {
    kind: filter.intent === 'count' ? 'count' : 'firs',
    firs,
    offenders: [],
    totalCount: countRow.total,
    evidence: firs.map((fir) => fir.fir_number),
    summary: describeFilter(filter, countRow.total),
  };
}
