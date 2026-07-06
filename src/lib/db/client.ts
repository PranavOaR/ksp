import DatabaseConstructor, { type Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema';
import { isSeeded, seedDatabase } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'drishti.db');

declare global {
  // eslint-disable-next-line no-var
  var __drishtiDb: Database | undefined;
}

function initDb(): Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseConstructor(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  if (!isSeeded(db)) {
    seedDatabase(db);
  }
  return db;
}

/** Singleton connection, cached on globalThis to survive Next.js hot reloads. */
export function getDb(): Database {
  if (!globalThis.__drishtiDb) {
    globalThis.__drishtiDb = initDb();
  }
  return globalThis.__drishtiDb;
}
