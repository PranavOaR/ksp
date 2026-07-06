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
