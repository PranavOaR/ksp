export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS persons (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  occupation TEXT NOT NULL,
  district TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS firs (
  id INTEGER PRIMARY KEY,
  fir_number TEXT NOT NULL UNIQUE,
  crime_type TEXT NOT NULL,
  district TEXT NOT NULL,
  station_id INTEGER NOT NULL REFERENCES stations(id),
  description TEXT NOT NULL,
  modus_operandi TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  registered_at TEXT NOT NULL,
  status TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS fir_accused (
  fir_id INTEGER NOT NULL REFERENCES firs(id),
  person_id INTEGER NOT NULL REFERENCES persons(id),
  PRIMARY KEY (fir_id, person_id)
);

CREATE TABLE IF NOT EXISTS fir_victims (
  fir_id INTEGER NOT NULL REFERENCES firs(id),
  person_id INTEGER NOT NULL REFERENCES persons(id),
  PRIMARY KEY (fir_id, person_id)
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('vehicle', 'phone', 'bank_account')),
  identifier TEXT NOT NULL,
  owner_person_id INTEGER REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS fir_assets (
  fir_id INTEGER NOT NULL REFERENCES firs(id),
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  PRIMARY KEY (fir_id, asset_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  from_asset_id INTEGER NOT NULL REFERENCES assets(id),
  to_asset_id INTEGER NOT NULL REFERENCES assets(id),
  amount REAL NOT NULL,
  occurred_at TEXT NOT NULL,
  fir_id INTEGER REFERENCES firs(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_firs_district ON firs(district);
CREATE INDEX IF NOT EXISTS idx_firs_crime_type ON firs(crime_type);
CREATE INDEX IF NOT EXISTS idx_firs_occurred_at ON firs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_fir_accused_person ON fir_accused(person_id);
`;

/**
 * v2: official KSP FIR System schema alignment (see docs/schema-mapping.md).
 * Additive only — v1 tables/columns are untouched, so every existing intel
 * module and test keeps working. Applied via PRAGMA user_version.
 *
 * Naming note: physical tables are snake_case; the official PascalCase
 * surface is exposed through the views in SCHEMA_VIEWS_SQL. The per-case
 * accused table is `case_accused` (not `accused`) because SQLite identifiers
 * are case-insensitive and the official view must be named `Accused`.
 */
const MIGRATION_V2 = `
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_id INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  state_id INTEGER NOT NULL REFERENCES states(id),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS unit_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city_dist_state TEXT NOT NULL,
  hierarchy INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type_id INTEGER NOT NULL REFERENCES unit_types(id),
  parent_unit_id INTEGER REFERENCES units(id),
  nationality_id INTEGER NOT NULL DEFAULT 1,
  state_id INTEGER NOT NULL REFERENCES states(id),
  district_id INTEGER REFERENCES districts(id),
  station_id INTEGER REFERENCES stations(id),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ranks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  hierarchy INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS designations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  district_id INTEGER REFERENCES districts(id),
  unit_id INTEGER NOT NULL REFERENCES units(id),
  rank_id INTEGER NOT NULL REFERENCES ranks(id),
  designation_id INTEGER NOT NULL REFERENCES designations(id),
  kgid TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  dob TEXT,
  gender_id INTEGER NOT NULL DEFAULT 1,
  blood_group_id INTEGER,
  physically_challenged INTEGER NOT NULL DEFAULT 0,
  appointment_date TEXT
);

CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  district_id INTEGER NOT NULL REFERENCES districts(id),
  state_id INTEGER NOT NULL REFERENCES states(id),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS case_categories (
  id INTEGER PRIMARY KEY,
  lookup_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gravity_offences (
  id INTEGER PRIMARY KEY,
  lookup_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_status_master (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS religion_master (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS caste_master (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS occupation_master (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crime_heads (
  id INTEGER PRIMARY KEY,
  crime_group_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crime_sub_heads (
  id INTEGER PRIMARY KEY,
  crime_head_id INTEGER NOT NULL REFERENCES crime_heads(id),
  crime_head_name TEXT NOT NULL,
  seq_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS acts (
  act_code TEXT PRIMARY KEY,
  act_description TEXT NOT NULL,
  short_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sections (
  act_code TEXT NOT NULL REFERENCES acts(act_code),
  section_code TEXT NOT NULL,
  section_description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (act_code, section_code)
);

CREATE TABLE IF NOT EXISTS crime_head_act_section (
  crime_head_id INTEGER NOT NULL REFERENCES crime_heads(id),
  crime_sub_head_id INTEGER NOT NULL REFERENCES crime_sub_heads(id),
  act_code TEXT NOT NULL REFERENCES acts(act_code),
  section_code TEXT NOT NULL,
  PRIMARY KEY (crime_sub_head_id, act_code, section_code)
);

CREATE TABLE IF NOT EXISTS act_section_association (
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  act_code TEXT NOT NULL REFERENCES acts(act_code),
  section_code TEXT NOT NULL,
  act_order_id INTEGER NOT NULL DEFAULT 1,
  section_order_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (case_master_id, act_code, section_code)
);

CREATE TABLE IF NOT EXISTS case_accused (
  accused_master_id INTEGER PRIMARY KEY,
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  accused_name TEXT NOT NULL,
  age_year INTEGER,
  gender_id INTEGER NOT NULL DEFAULT 0,
  person_label TEXT NOT NULL,
  resolved_person_id INTEGER REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS case_victims (
  victim_master_id INTEGER PRIMARY KEY,
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  victim_name TEXT NOT NULL,
  age_year INTEGER,
  gender_id INTEGER NOT NULL DEFAULT 0,
  victim_police INTEGER NOT NULL DEFAULT 0,
  resolved_person_id INTEGER REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS complainants (
  complainant_id INTEGER PRIMARY KEY,
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  complainant_name TEXT NOT NULL,
  age_year INTEGER,
  occupation_id INTEGER REFERENCES occupation_master(id),
  religion_id INTEGER REFERENCES religion_master(id),
  caste_id INTEGER REFERENCES caste_master(id),
  gender_id INTEGER NOT NULL DEFAULT 0,
  resolved_person_id INTEGER REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS arrest_surrender (
  arrest_surrender_id INTEGER PRIMARY KEY,
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  arrest_surrender_type_id INTEGER NOT NULL DEFAULT 1,
  arrest_surrender_date TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  district_id INTEGER REFERENCES districts(id),
  police_station_id INTEGER REFERENCES units(id),
  io_id INTEGER REFERENCES employees(id),
  court_id INTEGER REFERENCES courts(id),
  accused_master_id INTEGER NOT NULL REFERENCES case_accused(accused_master_id),
  is_accused INTEGER NOT NULL DEFAULT 1,
  is_complainant_accused INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chargesheet_details (
  cs_id INTEGER PRIMARY KEY,
  case_master_id INTEGER NOT NULL REFERENCES firs(id),
  cs_date TEXT NOT NULL,
  cs_type TEXT NOT NULL CHECK (cs_type IN ('A', 'B', 'C')),
  police_person_id INTEGER REFERENCES employees(id)
);

ALTER TABLE firs ADD COLUMN crime_no TEXT;
ALTER TABLE firs ADD COLUMN case_no TEXT;
ALTER TABLE firs ADD COLUMN case_category_id INTEGER;
ALTER TABLE firs ADD COLUMN gravity_offence_id INTEGER;
ALTER TABLE firs ADD COLUMN crime_major_head_id INTEGER;
ALTER TABLE firs ADD COLUMN crime_minor_head_id INTEGER;
ALTER TABLE firs ADD COLUMN case_status_id INTEGER;
ALTER TABLE firs ADD COLUMN court_id INTEGER;
ALTER TABLE firs ADD COLUMN police_person_id INTEGER;
ALTER TABLE firs ADD COLUMN incident_from_date TEXT;
ALTER TABLE firs ADD COLUMN incident_to_date TEXT;
ALTER TABLE firs ADD COLUMN info_received_ps_date TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_firs_crime_no ON firs(crime_no) WHERE crime_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_firs_district_occurred ON firs(district, occurred_at);
CREATE INDEX IF NOT EXISTS idx_firs_type_occurred ON firs(crime_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_case_accused_case ON case_accused(case_master_id);
CREATE INDEX IF NOT EXISTS idx_case_accused_person ON case_accused(resolved_person_id);
CREATE INDEX IF NOT EXISTS idx_asa_case ON act_section_association(case_master_id);
CREATE INDEX IF NOT EXISTS idx_arrest_case ON arrest_surrender(case_master_id);
CREATE INDEX IF NOT EXISTS idx_cs_case ON chargesheet_details(case_master_id);
`;

/**
 * v3: legal knowledge base for document-grounded Copilot answers (RAG-lite,
 * Module A6). kb_docs holds act/section text + SOP passages; kb_fts is an
 * external-content FTS5 index kept in sync by triggers.
 */
const MIGRATION_V3 = `
CREATE TABLE IF NOT EXISTS kb_docs (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
  title, content, content='kb_docs', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS kb_docs_ai AFTER INSERT ON kb_docs BEGIN
  INSERT INTO kb_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS kb_docs_ad AFTER DELETE ON kb_docs BEGIN
  INSERT INTO kb_fts(kb_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS kb_docs_au AFTER UPDATE ON kb_docs BEGIN
  INSERT INTO kb_fts(kb_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO kb_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
`;

/**
 * Ordered migration list; MIGRATIONS[n] moves the DB from user_version n to
 * n + 1. Never edit a shipped migration — append a new one.
 */
export const MIGRATIONS: readonly string[] = [MIGRATION_V2, MIGRATION_V3];

/**
 * The official KSP FIR System surface: every entity from the ER diagram,
 * with its official PascalCase table and column names, as views over the
 * physical tables. \`SELECT * FROM CaseMaster\` returns the official shape.
 */
export const SCHEMA_VIEWS_SQL = `
CREATE VIEW IF NOT EXISTS CaseMaster AS
  SELECT id AS CaseMasterID, crime_no AS CrimeNo, case_no AS CaseNo,
         registered_at AS CrimeRegisteredDate, police_person_id AS PolicePersonID,
         station_id AS PoliceStationID, case_category_id AS CaseCategoryID,
         gravity_offence_id AS GravityOffenceID, crime_major_head_id AS CrimeMajorHeadID,
         crime_minor_head_id AS CrimeMinorHeadID, case_status_id AS CaseStatusID,
         court_id AS CourtID, incident_from_date AS IncidentFromDate,
         incident_to_date AS IncidentToDate, info_received_ps_date AS InfoReceivedPSDate,
         lat AS latitude, lon AS longitude, description AS BriefFacts
  FROM firs;

CREATE VIEW IF NOT EXISTS Accused AS
  SELECT accused_master_id AS AccusedMasterID, case_master_id AS CaseMasterID,
         accused_name AS AccusedName, age_year AS AgeYear, gender_id AS GenderID,
         person_label AS PersonID
  FROM case_accused;

CREATE VIEW IF NOT EXISTS Victim AS
  SELECT victim_master_id AS VictimMasterID, case_master_id AS CaseMasterID,
         victim_name AS VictimName, age_year AS AgeYear, gender_id AS GenderID,
         victim_police AS VictimPolice
  FROM case_victims;

CREATE VIEW IF NOT EXISTS ComplainantDetails AS
  SELECT complainant_id AS ComplainantID, case_master_id AS CaseMasterID,
         complainant_name AS ComplainantName, age_year AS AgeYear,
         occupation_id AS OccupationID, religion_id AS ReligionID,
         caste_id AS CasteID, gender_id AS GenderID
  FROM complainants;

CREATE VIEW IF NOT EXISTS ArrestSurrender AS
  SELECT arrest_surrender_id AS ArrestSurrenderID, case_master_id AS CaseMasterID,
         arrest_surrender_type_id AS ArrestSurrenderTypeID,
         arrest_surrender_date AS ArrestSurrenderDate, state_id AS ArrestSurrenderStateId,
         district_id AS ArrestSurrenderDistrictId, police_station_id AS PoliceStationID,
         io_id AS IOID, court_id AS CourtID, accused_master_id AS AccusedMasterID,
         is_accused AS IsAccused, is_complainant_accused AS IsComplainantAccused
  FROM arrest_surrender;

CREATE VIEW IF NOT EXISTS ChargesheetDetails AS
  SELECT cs_id AS CSID, case_master_id AS CaseMasterID, cs_date AS csdate,
         cs_type AS cstype, police_person_id AS PolicePersonID
  FROM chargesheet_details;

CREATE VIEW IF NOT EXISTS Act AS
  SELECT act_code AS ActCode, act_description AS ActDescription,
         short_name AS ShortName, active AS Active
  FROM acts;

CREATE VIEW IF NOT EXISTS Section AS
  SELECT act_code AS ActCode, section_code AS SectionCode,
         section_description AS SectionDescription, active AS Active
  FROM sections;

CREATE VIEW IF NOT EXISTS ActSectionAssociation AS
  SELECT case_master_id AS CaseMasterID, act_code AS ActID, section_code AS SectionID,
         act_order_id AS ActOrderID, section_order_id AS SectionOrderID
  FROM act_section_association;

CREATE VIEW IF NOT EXISTS CrimeHead AS
  SELECT id AS CrimeHeadID, crime_group_name AS CrimeGroupName, active AS Active
  FROM crime_heads;

CREATE VIEW IF NOT EXISTS CrimeSubHead AS
  SELECT id AS CrimeSubHeadID, crime_head_id AS CrimeHeadID,
         crime_head_name AS CrimeHeadName, seq_id AS SeqID
  FROM crime_sub_heads;

CREATE VIEW IF NOT EXISTS CrimeHeadActSection AS
  SELECT crime_head_id AS CrimeHeadID, act_code AS ActCode, section_code AS SectionCode
  FROM crime_head_act_section;

CREATE VIEW IF NOT EXISTS CaseCategory AS
  SELECT id AS CaseCategoryID, lookup_value AS LookupValue FROM case_categories;

CREATE VIEW IF NOT EXISTS GravityOffence AS
  SELECT id AS GravityOffenceID, lookup_value AS LookupValue FROM gravity_offences;

CREATE VIEW IF NOT EXISTS CaseStatusMaster AS
  SELECT id AS CaseStatusID, name AS CaseStatusName FROM case_status_master;

CREATE VIEW IF NOT EXISTS CasteMaster AS
  SELECT id AS caste_master_id, name AS caste_master_name FROM caste_master;

CREATE VIEW IF NOT EXISTS ReligionMaster AS
  SELECT id AS ReligionID, name AS ReligionName FROM religion_master;

CREATE VIEW IF NOT EXISTS OccupationMaster AS
  SELECT id AS OccupationID, name AS OccupationName FROM occupation_master;

CREATE VIEW IF NOT EXISTS Court AS
  SELECT id AS CourtID, name AS CourtName, district_id AS DistrictID,
         state_id AS StateID, active AS Active
  FROM courts;

CREATE VIEW IF NOT EXISTS District AS
  SELECT id AS DistrictID, name AS DistrictName, state_id AS StateID, active AS Active
  FROM districts;

CREATE VIEW IF NOT EXISTS State AS
  SELECT id AS StateID, name AS StateName, nationality_id AS NationalityID, active AS Active
  FROM states;

CREATE VIEW IF NOT EXISTS Unit AS
  SELECT id AS UnitID, name AS UnitName, type_id AS TypeID, parent_unit_id AS ParentUnit,
         nationality_id AS NationalityID, state_id AS StateID, district_id AS DistrictID,
         active AS Active
  FROM units;

CREATE VIEW IF NOT EXISTS UnitType AS
  SELECT id AS UnitTypeID, name AS UnitTypeName, city_dist_state AS CityDistState,
         hierarchy AS Hierarchy, active AS Active
  FROM unit_types;

CREATE VIEW IF NOT EXISTS Rank AS
  SELECT id AS RankID, name AS RankName, hierarchy AS Hierarchy, active AS Active
  FROM ranks;

CREATE VIEW IF NOT EXISTS Designation AS
  SELECT id AS DesignationID, name AS DesignationName, active AS Active,
         sort_order AS SortOrder
  FROM designations;

CREATE VIEW IF NOT EXISTS Employee AS
  SELECT id AS EmployeeID, district_id AS DistrictID, unit_id AS UnitID,
         rank_id AS RankID, designation_id AS DesignationID, kgid AS KGID,
         first_name AS FirstName, dob AS EmployeeDOB, gender_id AS GenderID,
         blood_group_id AS BloodGroupID, physically_challenged AS PhysicallyChallenged,
         appointment_date AS AppointmentDate
  FROM employees;
`;

/**
 * Brings any database (fresh or existing) to the current schema version and
 * refreshes the official views. Idempotent and cheap — safe to call from
 * both initDb and seedDatabase (tests build in-memory DBs from SCHEMA_SQL
 * alone, so seeding must be able to self-migrate).
 */
export function applyMigrations(db: import('better-sqlite3').Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
    const migrate = db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    });
    migrate();
  }
  db.exec(SCHEMA_VIEWS_SQL);
}
