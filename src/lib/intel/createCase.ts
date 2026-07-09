import type { Database } from 'better-sqlite3';
import { z } from 'zod';
import { CRIME_TYPES, DISTRICTS, FIR_STATUSES } from '../constants';
import {
  gravityIdForCrimeType,
  hasV2Schema,
  headIdsForCrimeType,
  insertActSections,
  nextCrimeNo,
  statusIdForStatus,
} from '../db/seedV2';
import { GENDER_IDS } from '../db/lookups';

const PersonInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: z.number().int().min(0).max(120).default(0),
  gender: z.enum(['Male', 'Female', 'Other', 'Unknown']).default('Unknown'),
  occupation: z.string().trim().max(60).default('Unknown'),
});

export const CaseInputSchema = z.object({
  crimeType: z.enum(CRIME_TYPES),
  district: z.enum(DISTRICTS),
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'occurredAt must be an ISO date-time'),
  status: z.enum(FIR_STATUSES).default('Open'),
  modusOperandi: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(1000),
  accused: z.array(PersonInputSchema).max(8).default([]),
  victims: z.array(PersonInputSchema).max(8).default([]),
  assets: z
    .array(
      z.object({
        type: z.enum(['vehicle', 'phone', 'bank_account']),
        identifier: z.string().trim().min(3).max(40),
      })
    )
    .max(8)
    .default([]),
});

export type CaseInput = z.infer<typeof CaseInputSchema>;

export interface CreatedCase {
  id: number;
  firNumber: string;
}

function findOrCreatePerson(
  db: Database,
  person: z.infer<typeof PersonInputSchema>,
  district: string
): number {
  const existing = db
    .prepare('SELECT id FROM persons WHERE lower(name) = lower(?) AND age = ? LIMIT 1')
    .get(person.name, person.age) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db
    .prepare('INSERT INTO persons (name, age, gender, occupation, district) VALUES (?, ?, ?, ?, ?)')
    .run(person.name, person.age, person.gender, person.occupation, district);
  return Number(result.lastInsertRowid);
}

function nextFirNumber(db: Database, district: string, year: string): string {
  const prefix = `FIR/${year}/${district.slice(0, 3).toUpperCase()}/`;
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM firs').get() as { count: number };
  let sequence = count + 1;
  let candidate = `${prefix}${String(sequence).padStart(4, '0')}`;
  while (db.prepare('SELECT 1 FROM firs WHERE fir_number = ?').get(candidate)) {
    sequence += 1;
    candidate = `${prefix}${String(sequence).padStart(4, '0')}`;
  }
  return candidate;
}

interface PartyRow {
  name: string;
  age: number;
  gender: string;
  personId: number;
}

/**
 * Official-schema companion rows for a newly registered case (crime_no,
 * classification FKs, per-case Accused/Victim rows, act/sections). No-op on
 * databases that haven't been migrated to v2 — content is identical either
 * way; the official layer is presentation for the KSP schema surface.
 */
function writeOfficialCaseRows(
  db: Database,
  firId: number,
  input: CaseInput,
  accused: PartyRow[],
  victims: PartyRow[],
  registeredAt: string
): void {
  if (!hasV2Schema(db)) return;

  const unit = db
    .prepare(
      `SELECT u.id, u.district_id FROM units u
       JOIN firs f ON f.station_id = u.station_id WHERE f.id = ?`
    )
    .get(firId) as { id: number; district_id: number | null } | undefined;
  const { crimeNo, caseNo } = nextCrimeNo(db, {
    categoryId: 1,
    districtName: input.district,
    unitId: unit?.id ?? 0,
    year: input.occurredAt.slice(0, 4),
  });
  const { majorHeadId, minorHeadId } = headIdsForCrimeType(input.crimeType);
  const io = unit
    ? (db
        .prepare('SELECT id FROM employees WHERE unit_id = ? ORDER BY id LIMIT 1')
        .get(unit.id) as { id: number } | undefined)
    : undefined;
  const court = unit?.district_id
    ? (db
        .prepare('SELECT id FROM courts WHERE district_id = ? LIMIT 1')
        .get(unit.district_id) as { id: number } | undefined)
    : undefined;

  db.prepare(
    `UPDATE firs SET crime_no = ?, case_no = ?, case_category_id = 1, gravity_offence_id = ?,
       crime_major_head_id = ?, crime_minor_head_id = ?, case_status_id = ?, court_id = ?,
       police_person_id = ?, incident_from_date = ?, incident_to_date = ?, info_received_ps_date = ?
     WHERE id = ?`
  ).run(
    crimeNo, caseNo, gravityIdForCrimeType(input.crimeType),
    majorHeadId, minorHeadId, statusIdForStatus(input.status),
    court?.id ?? null, io?.id ?? null,
    input.occurredAt, input.occurredAt, registeredAt,
    firId
  );

  const insertAccused = db.prepare(
    `INSERT INTO case_accused (case_master_id, accused_name, age_year, gender_id, person_label, resolved_person_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  accused.forEach((party, index) => {
    insertAccused.run(
      firId, party.name, party.age,
      GENDER_IDS[party.gender] ?? GENDER_IDS.Unknown,
      `A${index + 1}`, party.personId
    );
  });

  const insertVictim = db.prepare(
    `INSERT INTO case_victims (case_master_id, victim_name, age_year, gender_id, victim_police, resolved_person_id)
     VALUES (?, ?, ?, ?, 0, ?)`
  );
  for (const party of victims) {
    insertVictim.run(
      firId, party.name, party.age,
      GENDER_IDS[party.gender] ?? GENDER_IDS.Unknown,
      party.personId
    );
  }

  insertActSections(db, firId, input.crimeType);
}

/**
 * Creates a real case file with its people and assets in a single
 * transaction (all-or-nothing). Input must already be validated with
 * CaseInputSchema — this function trusts its types, not its content origin.
 */
export function createCaseFile(db: Database, input: CaseInput): CreatedCase {
  const station = db
    .prepare('SELECT id, name, lat, lon FROM stations WHERE district = ? LIMIT 1')
    .get(input.district) as { id: number; name: string; lat: number; lon: number } | undefined;
  if (!station) {
    throw new Error(`No police station configured for district ${input.district}`);
  }

  const insertAll = db.transaction((): CreatedCase => {
    const firNumber = nextFirNumber(db, input.district, input.occurredAt.slice(0, 4));
    const registeredAt = new Date().toISOString().slice(0, 19);
    const firResult = db
      .prepare(
        `INSERT INTO firs (fir_number, crime_type, district, station_id, description,
           modus_operandi, occurred_at, registered_at, status, lat, lon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        firNumber,
        input.crimeType,
        input.district,
        station.id,
        input.description,
        input.modusOperandi,
        input.occurredAt,
        registeredAt,
        input.status,
        station.lat,
        station.lon
      );
    const firId = Number(firResult.lastInsertRowid);

    const accusedRows: PartyRow[] = input.accused.map((person) => ({
      name: person.name,
      age: person.age,
      gender: person.gender,
      personId: findOrCreatePerson(db, person, input.district),
    }));
    const accusedIds = accusedRows.map((row) => row.personId);
    for (const personId of accusedIds) {
      db.prepare('INSERT OR IGNORE INTO fir_accused (fir_id, person_id) VALUES (?, ?)').run(
        firId,
        personId
      );
    }
    const victimRows: PartyRow[] = [];
    for (const person of input.victims) {
      const personId = findOrCreatePerson(db, person, input.district);
      if (!accusedIds.includes(personId)) {
        db.prepare('INSERT OR IGNORE INTO fir_victims (fir_id, person_id) VALUES (?, ?)').run(
          firId,
          personId
        );
        victimRows.push({ name: person.name, age: person.age, gender: person.gender, personId });
      }
    }

    for (const asset of input.assets) {
      const existingAsset = db
        .prepare('SELECT id FROM assets WHERE type = ? AND identifier = ? LIMIT 1')
        .get(asset.type, asset.identifier) as { id: number } | undefined;
      const assetId = existingAsset
        ? existingAsset.id
        : Number(
            db
              .prepare('INSERT INTO assets (type, identifier, owner_person_id) VALUES (?, ?, ?)')
              .run(asset.type, asset.identifier, accusedIds[0] ?? null).lastInsertRowid
          );
      db.prepare('INSERT OR IGNORE INTO fir_assets (fir_id, asset_id) VALUES (?, ?)').run(
        firId,
        assetId
      );
    }

    writeOfficialCaseRows(db, firId, input, accusedRows, victimRows, registeredAt);

    return { id: firId, firNumber };
  });

  return insertAll();
}

export function updateCaseStatus(db: Database, firId: number, status: string): boolean {
  if (!(FIR_STATUSES as readonly string[]).includes(status)) return false;
  const result = db.prepare('UPDATE firs SET status = ? WHERE id = ?').run(status, firId);
  if (result.changes > 0 && hasV2Schema(db)) {
    db.prepare('UPDATE firs SET case_status_id = ? WHERE id = ?').run(
      statusIdForStatus(status),
      firId
    );
  }
  return result.changes > 0;
}
