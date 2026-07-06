import type { Database } from 'better-sqlite3';

interface PersonSummary {
  id: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  priorCases?: number;
}

interface SimilarCase {
  id: number;
  fir_number: string;
  crime_type: string;
  district: string;
  occurred_at: string;
  status: string;
  matchReason: string;
}

export interface CaseIntelligence {
  fir: {
    id: number;
    fir_number: string;
    crime_type: string;
    district: string;
    station_name: string;
    description: string;
    modus_operandi: string;
    occurred_at: string;
    registered_at: string;
    status: string;
  };
  accused: PersonSummary[];
  victims: PersonSummary[];
  timeline: Array<{ at: string; event: string }>;
  similarCases: SimilarCase[];
  leads: string[];
}

function getPersons(db: Database, firId: number, table: 'fir_accused' | 'fir_victims'): PersonSummary[] {
  return db
    .prepare(
      `SELECT p.id, p.name, p.age, p.gender, p.occupation,
              (SELECT COUNT(*) FROM fir_accused fa2 WHERE fa2.person_id = p.id) AS priorCases
       FROM persons p JOIN ${table} link ON link.person_id = p.id
       WHERE link.fir_id = ?`
    )
    .all(firId) as PersonSummary[];
}

function findSimilarCases(
  db: Database,
  fir: CaseIntelligence['fir']
): SimilarCase[] {
  const rows = db
    .prepare(
      `SELECT id, fir_number, crime_type, district, occurred_at, status, modus_operandi
       FROM firs
       WHERE id != ? AND (modus_operandi = ? OR (crime_type = ? AND district = ?))
       ORDER BY occurred_at DESC LIMIT 6`
    )
    .all(fir.id, fir.modus_operandi, fir.crime_type, fir.district) as Array<
    SimilarCase & { modus_operandi: string }
  >;
  return rows.map((row) => ({
    id: row.id,
    fir_number: row.fir_number,
    crime_type: row.crime_type,
    district: row.district,
    occurred_at: row.occurred_at,
    status: row.status,
    matchReason:
      row.modus_operandi === fir.modus_operandi
        ? `Identical modus operandi: "${fir.modus_operandi}"`
        : `Same crime type and district (${fir.crime_type}, ${fir.district})`,
  }));
}

function buildLeads(db: Database, firId: number, accused: PersonSummary[]): string[] {
  const leads: string[] = [];
  for (const person of accused) {
    const coAccused = db
      .prepare(
        `SELECT DISTINCT p.name FROM persons p
         JOIN fir_accused fa ON fa.person_id = p.id
         WHERE fa.fir_id IN (SELECT fir_id FROM fir_accused WHERE person_id = ?)
           AND p.id != ? LIMIT 3`
      )
      .all(person.id, person.id) as Array<{ name: string }>;
    if (coAccused.length > 0) {
      leads.push(
        `${person.name} has known associates from prior cases: ${coAccused
          .map((row) => row.name)
          .join(', ')} — check for involvement.`
      );
    }
    const accounts = db
      .prepare(
        `SELECT COUNT(*) AS count FROM transactions t
         JOIN assets a ON a.id IN (t.from_asset_id, t.to_asset_id)
         WHERE a.owner_person_id = ? AND t.amount > 100000`
      )
      .get(person.id) as { count: number };
    if (accounts.count > 0) {
      leads.push(
        `${person.name} is linked to ${accounts.count} high-value transactions (>₹1L) — refer to Financial Crime Unit.`
      );
    }
  }
  const sharedAssets = db
    .prepare(
      `SELECT a.identifier, a.type FROM assets a
       JOIN fir_assets fa ON fa.asset_id = a.id WHERE fa.fir_id = ?`
    )
    .all(firId) as Array<{ identifier: string; type: string }>;
  for (const asset of sharedAssets.slice(0, 3)) {
    leads.push(`Trace ${asset.type.replace('_', ' ')} ${asset.identifier} across other FIRs.`);
  }
  if (leads.length === 0) {
    leads.push('No network leads found — canvass similar-MO cases listed below.');
  }
  return leads;
}

/**
 * Investigator decision support (PRD F1–F4): automated case summary,
 * timeline, similar-case retrieval, and suggested leads for one FIR.
 */
export function buildCaseIntelligence(db: Database, firId: number): CaseIntelligence | null {
  const fir = db
    .prepare(
      `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
              f.description, f.modus_operandi, f.occurred_at, f.registered_at, f.status
       FROM firs f JOIN stations s ON s.id = f.station_id WHERE f.id = ?`
    )
    .get(firId) as CaseIntelligence['fir'] | undefined;
  if (!fir) return null;

  const accused = getPersons(db, firId, 'fir_accused');
  const victims = getPersons(db, firId, 'fir_victims');

  const timeline = [
    { at: fir.occurred_at, event: `Incident occurred — ${fir.crime_type} (${fir.modus_operandi})` },
    { at: fir.registered_at, event: `FIR ${fir.fir_number} registered at ${fir.station_name}` },
    ...accused.map((person) => ({
      at: fir.registered_at,
      event: `${person.name} named as accused (${person.priorCases} total case${
        (person.priorCases ?? 0) === 1 ? '' : 's'
      } on record)`,
    })),
    {
      at: fir.registered_at,
      event: `Current status: ${fir.status}`,
    },
  ];

  return {
    fir,
    accused,
    victims,
    timeline,
    similarCases: findSimilarCases(db, fir),
    leads: buildLeads(db, firId, accused),
  };
}
