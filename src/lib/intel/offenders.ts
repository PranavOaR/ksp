import type { Database } from 'better-sqlite3';
import { DATASET_END } from '../constants';
import { computeRiskScore } from './riskScoring';
import type { OffenderProfile } from './types';

interface OffenderRow {
  id: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  district: string;
  caseCount: number;
  crimeTypes: string;
  lastActive: string;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY));
}

/**
 * Repeat offender detection + behavioural profile + risk scoring
 * (PRD E1, E2, E3). "Now" is pinned to the dataset end so the synthetic
 * demo scores are stable.
 */
export function getOffenderProfiles(db: Database, minCases = 2): OffenderProfile[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.age, p.gender, p.occupation, p.district,
              COUNT(DISTINCT fa.fir_id) AS caseCount,
              GROUP_CONCAT(DISTINCT f.crime_type) AS crimeTypes,
              MAX(f.occurred_at) AS lastActive
       FROM persons p
       JOIN fir_accused fa ON fa.person_id = p.id
       JOIN firs f ON f.id = fa.fir_id
       GROUP BY p.id
       HAVING caseCount >= ?
       ORDER BY caseCount DESC`
    )
    .all(minCases) as OffenderRow[];

  const degreeStmt = db.prepare(
    `SELECT COUNT(DISTINCT fa2.person_id) AS degree
     FROM fir_accused fa1
     JOIN fir_accused fa2 ON fa1.fir_id = fa2.fir_id AND fa2.person_id != fa1.person_id
     WHERE fa1.person_id = ?`
  );

  return rows.map((row) => {
    const { degree } = degreeStmt.get(row.id) as { degree: number };
    const crimeTypes = row.crimeTypes.split(',');
    const risk = computeRiskScore({
      priorOffenses: row.caseCount,
      networkDegree: degree,
      daysSinceLastCase: daysBetween(row.lastActive, `${DATASET_END}T00:00:00`),
      crimeTypeCount: crimeTypes.length,
    });
    return {
      personId: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      occupation: row.occupation,
      district: row.district,
      caseCount: row.caseCount,
      crimeTypes,
      networkDegree: degree,
      lastActive: row.lastActive,
      riskScore: risk.score,
      riskCategory: risk.category,
    };
  });
}

export function getCoAccusedPairs(db: Database) {
  return db
    .prepare(
      `SELECT fa1.person_id AS a, fa2.person_id AS b, COUNT(*) AS timesTogether
       FROM fir_accused fa1
       JOIN fir_accused fa2 ON fa1.fir_id = fa2.fir_id AND fa1.person_id < fa2.person_id
       GROUP BY fa1.person_id, fa2.person_id`
    )
    .all() as Array<{ a: number; b: number; timesTogether: number }>;
}
