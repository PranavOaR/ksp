import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { beforeEach, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { CaseInputSchema, createCaseFile, updateCaseStatus } from '@/lib/intel/createCase';

function makeLiveDb(): Database {
  const db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  db.prepare('INSERT INTO stations (name, district, lat, lon) VALUES (?, ?, ?, ?)').run(
    'Mysuru North PS',
    'Mysuru',
    12.3,
    76.64
  );
  return db;
}

const validInput = CaseInputSchema.parse({
  crimeType: 'Theft',
  district: 'Mysuru',
  occurredAt: '2026-07-01T21:30',
  status: 'Open',
  modusOperandi: 'Two-wheeler drive-by snatching',
  description: 'Gold chain snatched near the market entrance.',
  accused: [{ name: 'Ramesh K', age: 28, gender: 'Male', occupation: 'Driver' }],
  victims: [{ name: 'Lakshmi D', age: 45, gender: 'Female', occupation: 'Teacher' }],
  assets: [{ type: 'vehicle', identifier: 'KA-09-XX-4321' }],
});

describe('createCaseFile (real data entry)', () => {
  let db: Database;
  beforeEach(() => {
    db = makeLiveDb();
  });

  test('creates the FIR with people and asset links in one transaction', () => {
    // Act
    const created = createCaseFile(db, validInput);

    // Assert
    expect(created.firNumber).toMatch(/^FIR\/2026\/MYS\/\d{4}$/);
    const fir = db.prepare('SELECT * FROM firs WHERE id = ?').get(created.id) as {
      crime_type: string;
      status: string;
    };
    expect(fir.crime_type).toBe('Theft');
    const accusedCount = db
      .prepare('SELECT COUNT(*) AS count FROM fir_accused WHERE fir_id = ?')
      .get(created.id) as { count: number };
    const victimCount = db
      .prepare('SELECT COUNT(*) AS count FROM fir_victims WHERE fir_id = ?')
      .get(created.id) as { count: number };
    const assetCount = db
      .prepare('SELECT COUNT(*) AS count FROM fir_assets WHERE fir_id = ?')
      .get(created.id) as { count: number };
    expect(accusedCount.count).toBe(1);
    expect(victimCount.count).toBe(1);
    expect(assetCount.count).toBe(1);
  });

  test('reuses an existing person on same name and age (repeat offender linking)', () => {
    createCaseFile(db, validInput);
    createCaseFile(db, { ...validInput, occurredAt: '2026-07-03T10:00' });

    const persons = db.prepare('SELECT COUNT(*) AS count FROM persons').get() as { count: number };
    // Ramesh K + Lakshmi D only — not duplicated across the two cases
    expect(persons.count).toBe(2);
    const rameshCases = db
      .prepare(
        `SELECT COUNT(*) AS count FROM fir_accused fa
         JOIN persons p ON p.id = fa.person_id WHERE p.name = 'Ramesh K'`
      )
      .get() as { count: number };
    expect(rameshCases.count).toBe(2);
  });

  test('generates unique sequential FIR numbers', () => {
    const first = createCaseFile(db, validInput);
    const second = createCaseFile(db, validInput);

    expect(first.firNumber).not.toBe(second.firNumber);
  });

  test('throws when the district has no station configured', () => {
    const input = { ...validInput, district: 'Ballari' as const };

    expect(() => createCaseFile(db, input)).toThrow(/No police station/);
  });

  test('schema rejects invalid enum values and hallucinated fields', () => {
    expect(
      CaseInputSchema.safeParse({ ...validInput, crimeType: 'Jaywalking' }).success
    ).toBe(false);
    expect(CaseInputSchema.safeParse({ ...validInput, district: 'Gotham' }).success).toBe(false);
    expect(
      CaseInputSchema.safeParse({ ...validInput, occurredAt: 'yesterday evening' }).success
    ).toBe(false);
  });
});

describe('updateCaseStatus', () => {
  test('updates to a valid status and rejects unknown statuses', () => {
    const db = makeLiveDb();
    const created = createCaseFile(db, validInput);

    expect(updateCaseStatus(db, created.id, 'Solved')).toBe(true);
    expect(updateCaseStatus(db, created.id, 'Vaporised')).toBe(false);
    expect(updateCaseStatus(db, 99999, 'Solved')).toBe(false);
  });
});
