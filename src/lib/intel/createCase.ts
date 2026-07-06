import type { Database } from 'better-sqlite3';
import { z } from 'zod';
import { CRIME_TYPES, DISTRICTS, FIR_STATUSES } from '../constants';

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

    const accusedIds = input.accused.map((person) =>
      findOrCreatePerson(db, person, input.district)
    );
    for (const personId of accusedIds) {
      db.prepare('INSERT OR IGNORE INTO fir_accused (fir_id, person_id) VALUES (?, ?)').run(
        firId,
        personId
      );
    }
    for (const person of input.victims) {
      const personId = findOrCreatePerson(db, person, input.district);
      if (!accusedIds.includes(personId)) {
        db.prepare('INSERT OR IGNORE INTO fir_victims (fir_id, person_id) VALUES (?, ?)').run(
          firId,
          personId
        );
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

    return { id: firId, firNumber };
  });

  return insertAll();
}

export function updateCaseStatus(db: Database, firId: number, status: string): boolean {
  if (!(FIR_STATUSES as readonly string[]).includes(status)) return false;
  const result = db.prepare('UPDATE firs SET status = ? WHERE id = ?').run(status, firId);
  return result.changes > 0;
}
