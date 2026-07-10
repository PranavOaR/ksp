import type { Database } from 'better-sqlite3';
import type { CrimeType, District } from '../constants';
import { type Rng } from '../random';
import {
  ACTS,
  CASE_CATEGORIES,
  CASE_STATUSES,
  CASTE_CATEGORIES,
  CRIME_HEADS,
  CRIME_HEAD_ACT_SECTIONS,
  CRIME_SUB_HEADS,
  DESIGNATIONS,
  DISTRICT_CODES,
  GENDER_IDS,
  GRAVITY_OFFENCES,
  HEINOUS_CRIME_TYPES,
  OCCUPATION_MASTER,
  RANKS,
  RELIGIONS,
  SECTIONS,
  SOP_SNIPPETS,
  STATES,
  STATE_KARNATAKA_ID,
  UNIT_TYPES,
} from './lookups';

/**
 * v2 seeding: official KSP schema data on top of the v1 synthetic dataset.
 *
 * Determinism contract: this module NEVER touches the v1 RNG stream — all
 * randomness comes from the second stream the caller passes in
 * (createRng(SEED + 1)), so the 480 v1 FIRs stay byte-identical forever.
 */

const FIRST_NAMES_IO = [
  'Basavaraj', 'Chandrashekar', 'Devraj', 'Ganesh', 'Hanumantha', 'Jagadish',
  'Krishnamurthy', 'Mallikarjun', 'Nagaraj', 'Puttaswamy', 'Rajanna', 'Siddaramu',
  'Thimmaiah', 'Veeranna', 'Yogesh', 'Bhagya', 'Chaitra', 'Netravati', 'Sharada', 'Vani',
];

const UNIT_TYPE_IDS = { HQ: 1, DISTRICT: 2, CIRCLE: 3, STATION: 4 } as const;
const RANK_IDS = { DGP: 1, SP: 5, PI: 8, PSI: 9, HC: 11 } as const;
const DESIGNATION_IDS = { DGP: 1, DISTRICT_SP: 2, SHO: 3, IO: 4, ANALYST: 5 } as const;

const STATUS_ID_BY_NAME = new Map(CASE_STATUSES.map((status) => [status.name, status.id]));
const SUB_HEAD_BY_CRIME = new Map(CRIME_SUB_HEADS.map((subHead) => [subHead.name, subHead]));
const SECTIONS_BY_CRIME = new Map(
  CRIME_HEAD_ACT_SECTIONS.map((entry) => [entry.crimeSubHead, entry])
);

/** True once MIGRATION_V2 has been applied (official tables exist). */
export function hasV2Schema(db: Database): boolean {
  return (db.pragma('user_version', { simple: true }) as number) >= 1;
}

/** Static lookups — idempotent, no RNG. Reference data for BOTH workspaces. */
export function seedLookups(db: Database): void {
  const run = db.transaction(() => {
    const state = db.prepare('INSERT OR IGNORE INTO states (id, name) VALUES (?, ?)');
    for (const row of STATES) state.run(row.id, row.name);

    const district = db.prepare(
      'INSERT OR IGNORE INTO districts (name, code, state_id) VALUES (?, ?, ?)'
    );
    for (const [name, code] of Object.entries(DISTRICT_CODES)) {
      district.run(name, code, STATE_KARNATAKA_ID);
    }

    const unitType = db.prepare(
      'INSERT OR IGNORE INTO unit_types (id, name, city_dist_state, hierarchy) VALUES (?, ?, ?, ?)'
    );
    for (const row of UNIT_TYPES) unitType.run(row.id, row.name, row.cityDistState, row.hierarchy);

    const rank = db.prepare('INSERT OR IGNORE INTO ranks (id, name, hierarchy) VALUES (?, ?, ?)');
    for (const row of RANKS) rank.run(row.id, row.name, row.hierarchy);

    const designation = db.prepare(
      'INSERT OR IGNORE INTO designations (id, name, sort_order) VALUES (?, ?, ?)'
    );
    for (const row of DESIGNATIONS) designation.run(row.id, row.name, row.sortOrder);

    const category = db.prepare(
      'INSERT OR IGNORE INTO case_categories (id, lookup_value) VALUES (?, ?)'
    );
    for (const row of CASE_CATEGORIES) category.run(row.id, row.value);

    const gravity = db.prepare(
      'INSERT OR IGNORE INTO gravity_offences (id, lookup_value) VALUES (?, ?)'
    );
    for (const row of GRAVITY_OFFENCES) gravity.run(row.id, row.value);

    const status = db.prepare('INSERT OR IGNORE INTO case_status_master (id, name) VALUES (?, ?)');
    for (const row of CASE_STATUSES) status.run(row.id, row.name);

    const religion = db.prepare('INSERT OR IGNORE INTO religion_master (id, name) VALUES (?, ?)');
    for (const row of RELIGIONS) religion.run(row.id, row.name);

    const caste = db.prepare('INSERT OR IGNORE INTO caste_master (id, name) VALUES (?, ?)');
    for (const row of CASTE_CATEGORIES) caste.run(row.id, row.name);

    const occupation = db.prepare(
      'INSERT OR IGNORE INTO occupation_master (id, name) VALUES (?, ?)'
    );
    for (const row of OCCUPATION_MASTER) occupation.run(row.id, row.name);

    const head = db.prepare(
      'INSERT OR IGNORE INTO crime_heads (id, crime_group_name) VALUES (?, ?)'
    );
    for (const row of CRIME_HEADS) head.run(row.id, row.groupName);

    const subHead = db.prepare(
      'INSERT OR IGNORE INTO crime_sub_heads (id, crime_head_id, crime_head_name, seq_id) VALUES (?, ?, ?, ?)'
    );
    for (const row of CRIME_SUB_HEADS) subHead.run(row.id, row.crimeHeadId, row.name, row.seq);

    const act = db.prepare(
      'INSERT OR IGNORE INTO acts (act_code, act_description, short_name) VALUES (?, ?, ?)'
    );
    for (const row of ACTS) act.run(row.code, row.description, row.shortName);

    const section = db.prepare(
      'INSERT OR IGNORE INTO sections (act_code, section_code, section_description) VALUES (?, ?, ?)'
    );
    for (const row of SECTIONS) section.run(row.actCode, row.sectionCode, row.description);

    const headActSection = db.prepare(
      `INSERT OR IGNORE INTO crime_head_act_section
         (crime_head_id, crime_sub_head_id, act_code, section_code) VALUES (?, ?, ?, ?)`
    );
    for (const entry of CRIME_HEAD_ACT_SECTIONS) {
      const subHeadRow = SUB_HEAD_BY_CRIME.get(entry.crimeSubHead);
      if (!subHeadRow) continue;
      for (const sectionCode of entry.sectionCodes) {
        headActSection.run(subHeadRow.crimeHeadId, subHeadRow.id, entry.actCode, sectionCode);
      }
    }

    const court = db.prepare(
      'INSERT OR IGNORE INTO courts (name, district_id, state_id) VALUES (?, ?, ?)'
    );
    const districtRows = db.prepare('SELECT id, name FROM districts').all() as Array<{
      id: number;
      name: string;
    }>;
    for (const row of districtRows) {
      court.run(`${row.name} District & Sessions Court`, row.id, STATE_KARNATAKA_ID);
    }
  });
  run();
}

/**
 * Org hierarchy: State HQ → one district office per district → every
 * stations row mirrored as a Police Station unit. Idempotent per station.
 */
export function seedUnits(db: Database): void {
  const run = db.transaction(() => {
    const districtIdByName = new Map(
      (db.prepare('SELECT id, name FROM districts').all() as Array<{ id: number; name: string }>).map(
        (row) => [row.name, row.id]
      )
    );

    const insertUnit = db.prepare(
      `INSERT INTO units (name, type_id, parent_unit_id, state_id, district_id, station_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let hq = db.prepare('SELECT id FROM units WHERE type_id = ?').get(UNIT_TYPE_IDS.HQ) as
      | { id: number }
      | undefined;
    if (!hq) {
      const result = insertUnit.run(
        'Karnataka State Police HQ', UNIT_TYPE_IDS.HQ, null, STATE_KARNATAKA_ID, null, null
      );
      hq = { id: Number(result.lastInsertRowid) };
    }

    const districtUnitByDistrictId = new Map<number, number>();
    for (const [districtName, districtId] of districtIdByName) {
      const existing = db
        .prepare('SELECT id FROM units WHERE type_id = ? AND district_id = ?')
        .get(UNIT_TYPE_IDS.DISTRICT, districtId) as { id: number } | undefined;
      if (existing) {
        districtUnitByDistrictId.set(districtId, existing.id);
        continue;
      }
      const result = insertUnit.run(
        `${districtName} District Police Office`,
        UNIT_TYPE_IDS.DISTRICT, hq.id, STATE_KARNATAKA_ID, districtId, null
      );
      districtUnitByDistrictId.set(districtId, Number(result.lastInsertRowid));
    }

    const stations = db
      .prepare(
        `SELECT s.id, s.name, s.district FROM stations s
         WHERE NOT EXISTS (SELECT 1 FROM units u WHERE u.station_id = s.id)`
      )
      .all() as Array<{ id: number; name: string; district: string }>;
    for (const station of stations) {
      const districtId = districtIdByName.get(station.district);
      insertUnit.run(
        station.name,
        UNIT_TYPE_IDS.STATION,
        districtId != null ? districtUnitByDistrictId.get(districtId) ?? hq.id : hq.id,
        STATE_KARNATAKA_ID,
        districtId ?? null,
        station.id
      );
    }
  });
  run();
}

/** Officers: DGP at HQ, an SP per district office, 2 IOs per station. */
export function seedEmployees(db: Database, rng: Rng): void {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM employees').get() as {
    count: number;
  };
  if (existing.count > 0) return;

  const insert = db.prepare(
    `INSERT INTO employees (district_id, unit_id, rank_id, designation_id, kgid, first_name, gender_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const units = db
    .prepare('SELECT id, type_id, district_id FROM units ORDER BY id')
    .all() as Array<{ id: number; type_id: number; district_id: number | null }>;

  let kgidSerial = 1000001;
  const nextKgid = (): string => `KGID${kgidSerial++}`;
  const pickName = (): string => rng.pick(FIRST_NAMES_IO);
  const pickGender = (): number => (rng.chance(0.8) ? GENDER_IDS.Male : GENDER_IDS.Female);

  const run = db.transaction(() => {
    for (const unit of units) {
      if (unit.type_id === UNIT_TYPE_IDS.HQ) {
        insert.run(null, unit.id, RANK_IDS.DGP, DESIGNATION_IDS.DGP, nextKgid(), pickName(), pickGender());
        insert.run(null, unit.id, RANK_IDS.PI, DESIGNATION_IDS.ANALYST, nextKgid(), pickName(), pickGender());
      } else if (unit.type_id === UNIT_TYPE_IDS.DISTRICT) {
        insert.run(unit.district_id, unit.id, RANK_IDS.SP, DESIGNATION_IDS.DISTRICT_SP, nextKgid(), pickName(), pickGender());
      } else if (unit.type_id === UNIT_TYPE_IDS.STATION) {
        insert.run(unit.district_id, unit.id, RANK_IDS.PI, DESIGNATION_IDS.SHO, nextKgid(), pickName(), pickGender());
        insert.run(unit.district_id, unit.id, RANK_IDS.PSI, DESIGNATION_IDS.IO, nextKgid(), pickName(), pickGender());
      }
    }
  });
  run();
}

export interface CrimeNoParts {
  categoryId: number;
  districtName: string;
  unitId: number;
  year: string;
}

/**
 * Official CrimeNo: 1-digit category + 4-digit district code + 4-digit unit
 * + 4-digit year + 5-digit per-prefix running serial (ER diagram format).
 */
export function nextCrimeNo(db: Database, parts: CrimeNoParts): { crimeNo: string; caseNo: string } {
  const districtCode = DISTRICT_CODES[parts.districtName as District] ?? '0000';
  const prefix = `${parts.categoryId}${districtCode}${String(parts.unitId).padStart(4, '0')}${parts.year}`;
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(crime_no, 14, 5) AS INTEGER)) AS maxSerial
       FROM firs WHERE substr(crime_no, 1, 13) = ?`
    )
    .get(prefix) as { maxSerial: number | null };
  const serial = (row.maxSerial ?? 0) + 1;
  const crimeNo = `${prefix}${String(serial).padStart(5, '0')}`;
  return { crimeNo, caseNo: crimeNo.slice(-9) };
}

export function gravityIdForCrimeType(crimeType: string): number {
  return HEINOUS_CRIME_TYPES.includes(crimeType as CrimeType) ? 1 : 2;
}

export function headIdsForCrimeType(
  crimeType: string
): { majorHeadId: number | null; minorHeadId: number | null } {
  const subHead = SUB_HEAD_BY_CRIME.get(crimeType as CrimeType);
  return subHead
    ? { majorHeadId: subHead.crimeHeadId, minorHeadId: subHead.id }
    : { majorHeadId: null, minorHeadId: null };
}

export function statusIdForStatus(status: string): number | null {
  return STATUS_ID_BY_NAME.get(status as (typeof CASE_STATUSES)[number]['name']) ?? null;
}

/** Inserts the act/section rows for a case based on its crime type. */
export function insertActSections(db: Database, caseId: number, crimeType: string): void {
  const entry = SECTIONS_BY_CRIME.get(crimeType as CrimeType);
  if (!entry) return;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO act_section_association
       (case_master_id, act_code, section_code, act_order_id, section_order_id)
     VALUES (?, ?, ?, 1, ?)`
  );
  entry.sectionCodes.forEach((sectionCode, index) => {
    insert.run(caseId, entry.actCode, sectionCode, index + 1);
  });
}

interface BackfillOptions {
  /** Demo-only: complainants, arrests and chargesheets are synthetic detail. */
  synthesizeDetails: boolean;
}

interface FirRow {
  id: number;
  crime_type: string;
  district: string;
  station_id: number;
  occurred_at: string;
  registered_at: string;
  status: string;
}

/**
 * Officializes every case that has no crime_no yet: official columns,
 * per-case party rows mirrored from the junctions (with resolved_person_id
 * back-links), act/sections, and — for the demo dataset — complainants,
 * arrests and chargesheet outcomes.
 */
export function backfillOfficialCaseData(
  db: Database,
  rng: Rng,
  options: BackfillOptions
): void {
  const pending = db
    .prepare(
      `SELECT id, crime_type, district, station_id, occurred_at, registered_at, status
       FROM firs WHERE crime_no IS NULL ORDER BY id`
    )
    .all() as FirRow[];
  if (pending.length === 0) return;

  const unitByStation = new Map(
    (db.prepare('SELECT id, station_id, district_id FROM units WHERE station_id IS NOT NULL').all() as Array<{
      id: number;
      station_id: number;
      district_id: number | null;
    }>).map((row) => [row.station_id, row])
  );
  const courtByDistrictId = new Map(
    (db.prepare('SELECT id, district_id FROM courts').all() as Array<{
      id: number;
      district_id: number;
    }>).map((row) => [row.district_id, row.id])
  );
  const iosByUnit = new Map<number, number[]>();
  for (const employee of db
    .prepare('SELECT id, unit_id FROM employees ORDER BY id')
    .all() as Array<{ id: number; unit_id: number }>) {
    const list = iosByUnit.get(employee.unit_id) ?? [];
    list.push(employee.id);
    iosByUnit.set(employee.unit_id, list);
  }

  const updateFir = db.prepare(
    `UPDATE firs SET crime_no = ?, case_no = ?, case_category_id = ?, gravity_offence_id = ?,
       crime_major_head_id = ?, crime_minor_head_id = ?, case_status_id = ?, court_id = ?,
       police_person_id = ?, incident_from_date = ?, incident_to_date = ?, info_received_ps_date = ?
     WHERE id = ?`
  );
  const insertAccused = db.prepare(
    `INSERT INTO case_accused (case_master_id, accused_name, age_year, gender_id, person_label, resolved_person_id)
     SELECT fa.fir_id, p.name, p.age, CASE p.gender WHEN 'Male' THEN 1 WHEN 'Female' THEN 2 ELSE 3 END,
            'A' || ROW_NUMBER() OVER (PARTITION BY fa.fir_id ORDER BY fa.person_id), fa.person_id
     FROM fir_accused fa JOIN persons p ON p.id = fa.person_id
     WHERE fa.fir_id = ?
       AND NOT EXISTS (SELECT 1 FROM case_accused ca
                       WHERE ca.case_master_id = fa.fir_id AND ca.resolved_person_id = fa.person_id)`
  );
  const insertVictims = db.prepare(
    `INSERT INTO case_victims (case_master_id, victim_name, age_year, gender_id, victim_police, resolved_person_id)
     SELECT fv.fir_id, p.name, p.age, CASE p.gender WHEN 'Male' THEN 1 WHEN 'Female' THEN 2 ELSE 3 END,
            0, fv.person_id
     FROM fir_victims fv JOIN persons p ON p.id = fv.person_id
     WHERE fv.fir_id = ?
       AND NOT EXISTS (SELECT 1 FROM case_victims cv
                       WHERE cv.case_master_id = fv.fir_id AND cv.resolved_person_id = fv.person_id)`
  );
  const insertComplainant = db.prepare(
    `INSERT INTO complainants (case_master_id, complainant_name, age_year, occupation_id, religion_id, caste_id, gender_id, resolved_person_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
  );
  const insertArrest = db.prepare(
    `INSERT INTO arrest_surrender (case_master_id, arrest_surrender_type_id, arrest_surrender_date,
       state_id, district_id, police_station_id, io_id, court_id, accused_master_id, is_accused)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const insertChargesheet = db.prepare(
    `INSERT INTO chargesheet_details (case_master_id, cs_date, cs_type, police_person_id)
     VALUES (?, ?, ?, ?)`
  );

  const complainantNamePool = FIRST_NAMES_IO;
  const addDays = (iso: string, days: number): string => {
    const date = new Date(`${iso.length <= 10 ? `${iso}T00:00:00` : iso}Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 19);
  };
  const addHours = (iso: string, hours: number): string => {
    const date = new Date(`${iso.length <= 10 ? `${iso}T00:00:00` : iso}Z`);
    date.setUTCHours(date.getUTCHours() + hours);
    return date.toISOString().slice(0, 19);
  };

  const run = db.transaction(() => {
    for (const fir of pending) {
      const unit = unitByStation.get(fir.station_id);
      const unitId = unit?.id ?? 0;
      const districtId = unit?.district_id ?? null;
      const categoryId = options.synthesizeDetails
        ? rng.chance(0.92) ? 1 : rng.pick([3, 4, 8])
        : 1;
      const year = fir.occurred_at.slice(0, 4);
      const { crimeNo, caseNo } = nextCrimeNo(db, {
        categoryId,
        districtName: fir.district,
        unitId,
        year,
      });
      const { majorHeadId, minorHeadId } = headIdsForCrimeType(fir.crime_type);
      const ios = iosByUnit.get(unitId) ?? [];
      const ioId = ios.length > 0 ? rng.pick(ios) : null;
      const courtId = districtId != null ? courtByDistrictId.get(districtId) ?? null : null;

      updateFir.run(
        crimeNo, caseNo, categoryId, gravityIdForCrimeType(fir.crime_type),
        majorHeadId, minorHeadId, statusIdForStatus(fir.status), courtId, ioId,
        fir.occurred_at, addHours(fir.occurred_at, rng.int(0, 3)), fir.registered_at,
        fir.id
      );

      insertAccused.run(fir.id);
      insertVictims.run(fir.id);
      insertActSections(db, fir.id, fir.crime_type);

      if (!options.synthesizeDetails) continue;

      insertComplainant.run(
        fir.id,
        `${rng.pick(complainantNamePool)} ${rng.pick(['Kumar', 'Gowda', 'Rao', 'Shetty', 'Naik'])}`,
        rng.int(21, 70),
        rng.int(1, OCCUPATION_MASTER.length),
        rng.int(1, RELIGIONS.length),
        rng.int(1, CASTE_CATEGORIES.length),
        rng.chance(0.7) ? GENDER_IDS.Male : GENDER_IDS.Female,
      );

      if (fir.status !== 'Open') {
        const accusedRows = db
          .prepare('SELECT accused_master_id FROM case_accused WHERE case_master_id = ?')
          .all(fir.id) as Array<{ accused_master_id: number }>;
        for (const accusedRow of accusedRows) {
          if (!rng.chance(0.4)) continue;
          insertArrest.run(
            fir.id,
            rng.chance(0.85) ? 1 : 2,
            addDays(fir.occurred_at, rng.int(2, 60)),
            STATE_KARNATAKA_ID, districtId, unitId || null, ioId, courtId,
            accusedRow.accused_master_id,
          );
        }
      }

      if (fir.status === 'Solved') {
        insertChargesheet.run(
          fir.id,
          addDays(fir.occurred_at, rng.int(30, 120)),
          rng.chance(0.9) ? 'A' : 'B',
          ioId,
        );
      } else if (fir.status === 'Under Investigation' && rng.chance(0.06)) {
        insertChargesheet.run(fir.id, addDays(fir.occurred_at, rng.int(90, 200)), 'C', ioId);
      }
    }
  });
  run();
}

/** All v2+ tables, in FK-safe deletion order (children first). */
export const V2_TABLES_WIPE_ORDER = [
  'kb_docs',
  'chargesheet_details',
  'arrest_surrender',
  'act_section_association',
  'complainants',
  'case_victims',
  'case_accused',
  'employees',
  'courts',
  'units',
  'crime_head_act_section',
  'sections',
  'acts',
  'crime_sub_heads',
  'crime_heads',
  'occupation_master',
  'caste_master',
  'religion_master',
  'case_status_master',
  'gravity_offences',
  'case_categories',
  'designations',
  'ranks',
  'unit_types',
  'districts',
  'states',
] as const;

/** True once MIGRATION_V3 (knowledge base) has been applied. */
export function hasKnowledgeBase(db: Database): boolean {
  return (db.pragma('user_version', { simple: true }) as number) >= 2;
}

/** Legal KB (Module A6): sections + SOPs into kb_docs (FTS via triggers). */
export function seedKnowledgeBase(db: Database): void {
  if (!hasKnowledgeBase(db)) return;
  const insert = db.prepare(
    'INSERT OR IGNORE INTO kb_docs (source, title, content) VALUES (?, ?, ?)'
  );
  const shortNameByAct = new Map<string, string>(ACTS.map((act) => [act.code, act.shortName]));
  const run = db.transaction(() => {
    for (const section of SECTIONS) {
      const shortName = shortNameByAct.get(section.actCode) ?? section.actCode;
      const headline = section.description.split('—')[0].trim();
      insert.run(
        shortName,
        `${shortName} §${section.sectionCode} — ${headline}`,
        section.description
      );
    }
    for (const snippet of SOP_SNIPPETS) {
      insert.run('SOP', snippet.title, snippet.content);
    }
  });
  run();
}

/** Full v2 pass for a workspace DB. Idempotent; call after v1 seeding. */
export function seedV2(db: Database, rng: Rng, options: BackfillOptions): void {
  seedLookups(db);
  seedUnits(db);
  seedEmployees(db, rng);
  backfillOfficialCaseData(db, rng, options);
  seedKnowledgeBase(db);
}
