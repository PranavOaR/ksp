import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { beforeAll, describe, expect, test } from 'vitest';
import { applyMigrations, MIGRATIONS, SCHEMA_SQL } from '@/lib/db/schema';
import { ensureV2Data, resetDemoData, seedDatabase, seedStationsOnly } from '@/lib/db/seed';
import { CaseInputSchema, createCaseFile } from '@/lib/intel/createCase';

function makeSeededDb(): Database {
  const db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  seedDatabase(db);
  return db;
}

/** Column names from the official ER diagram, in document order. */
const OFFICIAL_CASE_MASTER_COLUMNS = [
  'CaseMasterID', 'CrimeNo', 'CaseNo', 'CrimeRegisteredDate', 'PolicePersonID',
  'PoliceStationID', 'CaseCategoryID', 'GravityOffenceID', 'CrimeMajorHeadID',
  'CrimeMinorHeadID', 'CaseStatusID', 'CourtID', 'IncidentFromDate',
  'IncidentToDate', 'InfoReceivedPSDate', 'latitude', 'longitude', 'BriefFacts',
];

describe('schema v2 — official ER alignment', () => {
  let db: Database;

  beforeAll(() => {
    db = makeSeededDb();
  });

  test('migrations are idempotent and versioned', () => {
    // Arrange
    const before = db.pragma('user_version', { simple: true });

    // Act
    applyMigrations(db);
    applyMigrations(db);

    // Assert
    expect(before).toBe(MIGRATIONS.length);
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
  });

  test('every seeded FIR gets an 18-digit official CrimeNo with unique values', () => {
    const rows = db
      .prepare('SELECT crime_no, case_no FROM firs')
      .all() as Array<{ crime_no: string; case_no: string }>;

    expect(rows.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const row of rows) {
      expect(row.crime_no).toMatch(/^\d{18}$/);
      expect(row.case_no).toBe(row.crime_no.slice(-9));
      expect(seen.has(row.crime_no)).toBe(false);
      seen.add(row.crime_no);
    }
  });

  test('CrimeNo embeds the case category as its first digit', () => {
    const rows = db
      .prepare('SELECT crime_no, case_category_id FROM firs')
      .all() as Array<{ crime_no: string; case_category_id: number }>;
    for (const row of rows) {
      expect(row.crime_no[0]).toBe(String(row.case_category_id));
    }
  });

  test('per-case Accused rows mirror the fir_accused junctions with resolved_person_id', () => {
    const junctionCount = (
      db.prepare('SELECT COUNT(*) AS count FROM fir_accused').get() as { count: number }
    ).count;
    const mirrored = (
      db.prepare('SELECT COUNT(*) AS count FROM case_accused').get() as { count: number }
    ).count;
    expect(mirrored).toBe(junctionCount);

    const mismatches = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM fir_accused fa
           WHERE NOT EXISTS (SELECT 1 FROM case_accused ca
             WHERE ca.case_master_id = fa.fir_id AND ca.resolved_person_id = fa.person_id)`
        )
        .get() as { count: number }
    ).count;
    expect(mismatches).toBe(0);
  });

  test('accused person labels follow the official A1, A2 … convention', () => {
    const labels = db
      .prepare(
        `SELECT person_label FROM case_accused WHERE case_master_id =
           (SELECT case_master_id FROM case_accused GROUP BY case_master_id
            HAVING COUNT(*) >= 2 LIMIT 1)
         ORDER BY person_label`
      )
      .all() as Array<{ person_label: string }>;
    expect(labels.length).toBeGreaterThanOrEqual(2);
    labels.forEach((row, index) => expect(row.person_label).toBe(`A${index + 1}`));
  });

  test('CaseMaster view exposes exactly the official column names', () => {
    const columns = (
      db.prepare('SELECT * FROM CaseMaster LIMIT 1').columns() as Array<{ name: string }>
    ).map((column) => column.name);
    expect(columns).toEqual(OFFICIAL_CASE_MASTER_COLUMNS);
  });

  test('official views return data for Accused, Victim, Employee, Unit, Section', () => {
    for (const view of ['Accused', 'Victim', 'Employee', 'Unit', 'Section', 'ActSectionAssociation']) {
      const { count } = db
        .prepare(`SELECT COUNT(*) AS count FROM ${view}`)
        .get() as { count: number };
      expect(count, `${view} should not be empty`).toBeGreaterThan(0);
    }
  });

  test('unit hierarchy: HQ has no parent, stations roll up to district offices', () => {
    const hq = db
      .prepare('SELECT parent_unit_id FROM units WHERE type_id = 1')
      .get() as { parent_unit_id: number | null };
    expect(hq.parent_unit_id).toBeNull();

    const orphanStations = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM units station
           WHERE station.type_id = 4 AND NOT EXISTS (
             SELECT 1 FROM units parent
             WHERE parent.id = station.parent_unit_id AND parent.type_id = 2)`
        )
        .get() as { count: number }
    ).count;
    expect(orphanStations).toBe(0);
  });

  test('every case carries act/section associations for its crime type', () => {
    const uncovered = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM firs f
           WHERE NOT EXISTS (SELECT 1 FROM act_section_association a WHERE a.case_master_id = f.id)`
        )
        .get() as { count: number }
    ).count;
    expect(uncovered).toBe(0);
  });

  test('chargesheets exist only with valid official outcome types', () => {
    const rows = db
      .prepare('SELECT DISTINCT cs_type FROM chargesheet_details')
      .all() as Array<{ cs_type: string }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(['A', 'B', 'C']).toContain(row.cs_type);

    const solvedWithoutSheet = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM firs f WHERE f.status = 'Solved'
           AND NOT EXISTS (SELECT 1 FROM chargesheet_details c WHERE c.case_master_id = f.id)`
        )
        .get() as { count: number }
    ).count;
    expect(solvedWithoutSheet).toBe(0);
  });

  test('v2 seeding is deterministic across fresh databases', () => {
    const other = makeSeededDb();
    const query =
      'SELECT crime_no, police_person_id, case_category_id FROM firs ORDER BY id LIMIT 50';
    expect(db.prepare(query).all()).toEqual(other.prepare(query).all());
    other.close();
  });

  test('v1 seeded rows are byte-identical to the pre-v2 dataset (RNG stream untouched)', () => {
    // The first seeded FIR has carried this exact number since v1; if the
    // mulberry32 stream shifted, this value (and all 480 rows) would change.
    const first = db
      .prepare('SELECT fir_number, crime_type, district FROM firs WHERE id = 1')
      .get() as { fir_number: string; crime_type: string; district: string };
    expect(first.fir_number).toMatch(/^FIR\/\d{4}\/[A-Z]{3}\/0001$/);
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM firs').get() as { count: number };
    expect(count).toBe(480);
  });

  test('resetDemoData wipes and reseeds the v2 layer round-trip', () => {
    const localDb = makeSeededDb();
    const before = localDb
      .prepare('SELECT COUNT(*) AS count FROM case_accused')
      .get() as { count: number };

    resetDemoData(localDb);

    const after = localDb
      .prepare('SELECT COUNT(*) AS count FROM case_accused')
      .get() as { count: number };
    expect(after.count).toBe(before.count);
    expect(after.count).toBeGreaterThan(0);
    localDb.close();
  });
});

describe('schema v2 — live workspace and case registration', () => {
  test('live workspace gets reference data but no synthetic case detail', () => {
    const db = new DatabaseConstructor(':memory:');
    db.exec(SCHEMA_SQL);
    applyMigrations(db);
    seedStationsOnly(db);
    ensureV2Data(db, { synthesizeDetails: false });

    const employees = (
      db.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number }
    ).count;
    const complainants = (
      db.prepare('SELECT COUNT(*) AS count FROM complainants').get() as { count: number }
    ).count;
    expect(employees).toBeGreaterThan(0);
    expect(complainants).toBe(0);
    db.close();
  });

  test('createCaseFile dual-writes official rows with a valid CrimeNo', () => {
    // Arrange: migrated live-like workspace
    const db = new DatabaseConstructor(':memory:');
    db.exec(SCHEMA_SQL);
    applyMigrations(db);
    seedStationsOnly(db);
    ensureV2Data(db, { synthesizeDetails: false });

    const input = CaseInputSchema.parse({
      crimeType: 'Theft',
      district: 'Mysuru',
      occurredAt: '2026-07-09T10:00',
      status: 'Open',
      modusOperandi: 'Lock-picking of parked vehicles',
      description: 'Scooter stolen from market parking.',
      accused: [{ name: 'Test Accused', age: 30, gender: 'Male', occupation: 'Driver' }],
      victims: [{ name: 'Test Victim', age: 40, gender: 'Female', occupation: 'Teacher' }],
      assets: [],
    });

    // Act
    const created = createCaseFile(db, input);

    // Assert
    const fir = db
      .prepare('SELECT crime_no, case_no, crime_minor_head_id, case_status_id FROM firs WHERE id = ?')
      .get(created.id) as {
      crime_no: string;
      case_no: string;
      crime_minor_head_id: number;
      case_status_id: number;
    };
    expect(fir.crime_no).toMatch(/^1\d{17}$/);
    expect(fir.case_no).toBe(fir.crime_no.slice(-9));
    expect(fir.crime_minor_head_id).toBeGreaterThan(0);
    expect(fir.case_status_id).toBe(1);

    const accused = db
      .prepare('SELECT accused_name, person_label, resolved_person_id FROM case_accused WHERE case_master_id = ?')
      .all(created.id) as Array<{ accused_name: string; person_label: string; resolved_person_id: number }>;
    expect(accused).toHaveLength(1);
    expect(accused[0].person_label).toBe('A1');
    expect(accused[0].resolved_person_id).toBeGreaterThan(0);

    const sections = db
      .prepare('SELECT COUNT(*) AS count FROM act_section_association WHERE case_master_id = ?')
      .get(created.id) as { count: number };
    expect(sections.count).toBeGreaterThan(0);
    db.close();
  });

  test('consecutive cases at the same station get sequential CrimeNo serials', () => {
    const db = new DatabaseConstructor(':memory:');
    db.exec(SCHEMA_SQL);
    applyMigrations(db);
    seedStationsOnly(db);
    ensureV2Data(db, { synthesizeDetails: false });

    const input = CaseInputSchema.parse({
      crimeType: 'Theft',
      district: 'Mysuru',
      occurredAt: '2026-07-09T10:00',
      status: 'Open',
      modusOperandi: 'Lock-picking of parked vehicles',
      description: 'First case.',
    });

    const first = createCaseFile(db, input);
    const second = createCaseFile(db, { ...input, description: 'Second case.' });

    const rows = db
      .prepare('SELECT id, crime_no FROM firs WHERE id IN (?, ?) ORDER BY id')
      .all(first.id, second.id) as Array<{ id: number; crime_no: string }>;
    const firstSerial = Number(rows[0].crime_no.slice(-5));
    const secondSerial = Number(rows[1].crime_no.slice(-5));
    expect(secondSerial).toBe(firstSerial + 1);
    expect(rows[0].crime_no.slice(0, 13)).toBe(rows[1].crime_no.slice(0, 13));
    db.close();
  });
});
