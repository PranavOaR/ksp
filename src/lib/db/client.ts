import DatabaseConstructor, { type Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Workspace } from '../workspace';
import { applyMigrations, SCHEMA_SQL } from './schema';
import { ensureV2Data, isSeeded, seedDatabase, seedStationsOnly } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILES: Record<Workspace, string> = {
  demo: 'drishti.db',
  live: 'drishti-live.db',
};

declare global {
  // eslint-disable-next-line no-var
  var __drishtiDbs: Partial<Record<Workspace, Database>> | undefined;
}

function initDb(workspace: Workspace): Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseConstructor(path.join(DATA_DIR, DB_FILES[workspace]));
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  applyMigrations(db);
  if (workspace === 'demo') {
    if (!isSeeded(db)) seedDatabase(db);
    // Pre-existing demo DBs migrate in place: layer v2 data over v1 rows
    else ensureV2Data(db, { synthesizeDetails: true });
  } else {
    // Live workspace holds only real records; stations, org hierarchy and
    // legal lookups are reference data. Existing cases get official columns
    // backfilled, but no synthetic complainants/arrests are invented.
    seedStationsOnly(db);
    ensureV2Data(db, { synthesizeDetails: false });
  }
  return db;
}

/**
 * Workspace-aware connections, cached on globalThis to survive hot reloads.
 * 'demo' = seeded synthetic data for testers; 'live' = the unit's own records.
 */
export function getDb(workspace: Workspace = 'demo'): Database {
  if (!globalThis.__drishtiDbs) globalThis.__drishtiDbs = {};
  if (!globalThis.__drishtiDbs[workspace]) {
    globalThis.__drishtiDbs[workspace] = initDb(workspace);
  }
  return globalThis.__drishtiDbs[workspace]!;
}
