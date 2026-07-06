import type { Database } from 'better-sqlite3';
import {
  CRIME_TYPES,
  DISTRICTS,
  DISTRICT_COORDS,
  FIR_STATUSES,
  MODUS_OPERANDI,
} from '../constants';
import { createRng, type Rng } from '../random';

const SEED = 20260706;
const PERSON_COUNT = 220;
const FIR_COUNT = 480;
const GANG_COUNT = 5;

const FIRST_NAMES = [
  'Ravi', 'Suresh', 'Manju', 'Prakash', 'Kiran', 'Santosh', 'Naveen', 'Harish',
  'Lokesh', 'Girish', 'Anitha', 'Lakshmi', 'Deepa', 'Kavya', 'Rekha', 'Sunita',
  'Imran', 'Salim', 'Abdul', 'Farhan', 'Joseph', 'David', 'Vinay', 'Mahesh',
  'Raghav', 'Shankar', 'Umesh', 'Venkatesh', 'Nagesh', 'Chandra',
];

const LAST_NAMES = [
  'Kumar', 'Gowda', 'Reddy', 'Shetty', 'Rao', 'Naik', 'Hegde', 'Patil',
  'Swamy', 'Murthy', 'Achar', 'Bhat', 'Khan', 'Shaikh', 'Dsouza', 'Nayak',
];

const OCCUPATIONS = [
  'Unemployed', 'Driver', 'Shop Worker', 'Mechanic', 'Delivery Agent',
  'Construction Worker', 'Software Employee', 'Street Vendor', 'Electrician',
  'Student', 'Broker', 'Security Guard',
];

const STATION_PREFIXES = ['North', 'South', 'East', 'West', 'Central', 'Rural', 'Market', 'Extension'];

function isoDate(year: number, month: number, day: number, hour: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:00:00`;
}

function randomDate(rng: Rng): { iso: string; year: number; month: number } {
  // 2024-01 .. 2026-06, weighted toward recent months for realistic trends
  const monthIndex = rng.chance(0.45) ? rng.int(18, 29) : rng.int(0, 29);
  const year = 2024 + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  const day = rng.int(1, 28);
  // Crime skews toward night hours
  const hour = rng.chance(0.55) ? rng.pick([20, 21, 22, 23, 0, 1, 2]) : rng.int(6, 19);
  return { iso: isoDate(year, month, day, hour), year, month };
}

function seedStations(db: Database, rng: Rng): number[] {
  const insert = db.prepare(
    'INSERT INTO stations (name, district, lat, lon) VALUES (?, ?, ?, ?)'
  );
  const ids: number[] = [];
  for (const district of DISTRICTS) {
    const stationCount = district === 'Bengaluru City' ? 6 : rng.int(2, 4);
    const base = DISTRICT_COORDS[district];
    for (let i = 0; i < stationCount; i += 1) {
      const name = `${district} ${STATION_PREFIXES[i % STATION_PREFIXES.length]} PS`;
      const lat = base.lat + (rng.next() - 0.5) * 0.3;
      const lon = base.lon + (rng.next() - 0.5) * 0.3;
      const result = insert.run(name, district, lat, lon);
      ids.push(Number(result.lastInsertRowid));
    }
  }
  return ids;
}

function seedPersons(db: Database, rng: Rng): number[] {
  const insert = db.prepare(
    'INSERT INTO persons (name, age, gender, occupation, district) VALUES (?, ?, ?, ?, ?)'
  );
  const ids: number[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < PERSON_COUNT; i += 1) {
    let name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    while (usedNames.has(name)) {
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${rng.pick(['B', 'K', 'M', 'S', 'R'])}`;
    }
    usedNames.add(name);
    const gender = rng.chance(0.78) ? 'Male' : 'Female';
    const result = insert.run(
      name,
      rng.int(18, 62),
      gender,
      rng.pick(OCCUPATIONS),
      rng.pick(DISTRICTS)
    );
    ids.push(Number(result.lastInsertRowid));
  }
  return ids;
}

interface GangDef {
  members: number[];
  crimeType: string;
  district: string;
}

function buildGangs(rng: Rng, personIds: number[]): GangDef[] {
  const gangs: GangDef[] = [];
  let cursor = 0;
  for (let g = 0; g < GANG_COUNT; g += 1) {
    const size = rng.int(4, 7);
    gangs.push({
      members: personIds.slice(cursor, cursor + size),
      crimeType: rng.pick(['Burglary', 'Vehicle Theft', 'Cybercrime', 'Extortion', 'Chain Snatching']),
      district: rng.pick(DISTRICTS),
    });
    cursor += size;
  }
  return gangs;
}

function seedAssets(db: Database, rng: Rng, personIds: number[]): Map<number, number[]> {
  const insert = db.prepare(
    'INSERT INTO assets (type, identifier, owner_person_id) VALUES (?, ?, ?)'
  );
  const byPerson = new Map<number, number[]>();
  for (const personId of personIds) {
    const assetIds: number[] = [];
    const phone = insert.run('phone', `+91-9${rng.int(100000000, 999999999)}`, personId);
    assetIds.push(Number(phone.lastInsertRowid));
    if (rng.chance(0.5)) {
      const reg = `KA-${String(rng.int(1, 60)).padStart(2, '0')}-${rng.pick(['A', 'B', 'E', 'H', 'M', 'N'])}${rng.pick(['A', 'B', 'C', 'D', 'J', 'K'])}-${rng.int(1000, 9999)}`;
      const vehicle = insert.run('vehicle', reg, personId);
      assetIds.push(Number(vehicle.lastInsertRowid));
    }
    if (rng.chance(0.6)) {
      const account = insert.run('bank_account', `AC${rng.int(10000000, 99999999)}`, personId);
      assetIds.push(Number(account.lastInsertRowid));
    }
    byPerson.set(personId, assetIds);
  }
  return byPerson;
}

interface FirSeedContext {
  rng: Rng;
  stationRows: Array<{ id: number; name: string; district: string; lat: number; lon: number }>;
  personIds: number[];
  gangs: GangDef[];
  assetsByPerson: Map<number, number[]>;
}

function seedFirs(db: Database, ctx: FirSeedContext): void {
  const { rng, stationRows, personIds, gangs, assetsByPerson } = ctx;
  const insertFir = db.prepare(`
    INSERT INTO firs (fir_number, crime_type, district, station_id, description,
      modus_operandi, occurred_at, registered_at, status, lat, lon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAccused = db.prepare('INSERT INTO fir_accused (fir_id, person_id) VALUES (?, ?)');
  const insertVictim = db.prepare('INSERT OR IGNORE INTO fir_victims (fir_id, person_id) VALUES (?, ?)');
  const insertFirAsset = db.prepare('INSERT OR IGNORE INTO fir_assets (fir_id, asset_id) VALUES (?, ?)');

  // A pool of habitual offenders (outside gangs) who keep re-appearing
  const gangMemberIds = new Set(gangs.flatMap((gang) => gang.members));
  const civilians = personIds.filter((id) => !gangMemberIds.has(id));
  const repeatOffenders = civilians.slice(0, 25);

  for (let i = 0; i < FIR_COUNT; i += 1) {
    const isGangCrime = rng.chance(0.28);
    const gang = isGangCrime ? rng.pick(gangs) : null;
    const crimeType = gang ? gang.crimeType : rng.pick(CRIME_TYPES);
    const district = gang && rng.chance(0.7) ? gang.district : rng.pick(DISTRICTS);
    const stationsInDistrict = stationRows.filter((s) => s.district === district);
    const station = rng.pick(stationsInDistrict);
    const { iso } = randomDate(rng);
    const status = rng.pick(FIR_STATUSES);
    const firNumber = `FIR/${iso.slice(0, 4)}/${district.slice(0, 3).toUpperCase()}/${String(i + 1).padStart(4, '0')}`;
    const mo = rng.pick(MODUS_OPERANDI);
    const description = `${crimeType} reported near ${station.name.replace(' PS', '')} area. MO: ${mo}.`;

    const result = insertFir.run(
      firNumber, crimeType, district, station.id, description, mo,
      iso, iso, status,
      station.lat + (rng.next() - 0.5) * 0.05,
      station.lon + (rng.next() - 0.5) * 0.05
    );
    const firId = Number(result.lastInsertRowid);

    const accused: number[] = gang
      ? gang.members.filter(() => rng.chance(0.55)).slice(0, 4)
      : rng.chance(0.4)
        ? [rng.pick(repeatOffenders)]
        : [rng.pick(civilians)];
    if (accused.length === 0 && gang) accused.push(gang.members[0]);

    for (const personId of accused) {
      insertAccused.run(firId, personId);
      const assets = assetsByPerson.get(personId) ?? [];
      for (const assetId of assets) {
        if (rng.chance(0.3)) insertFirAsset.run(firId, assetId);
      }
    }

    const victimCount = rng.int(1, 2);
    for (let v = 0; v < victimCount; v += 1) {
      const victim = rng.pick(civilians.slice(25));
      if (!accused.includes(victim)) insertVictim.run(firId, victim);
    }
  }
}

function seedTransactions(db: Database, rng: Rng, assetsByPerson: Map<number, number[]>): void {
  const accounts = db
    .prepare("SELECT id FROM assets WHERE type = 'bank_account'")
    .all() as Array<{ id: number }>;
  if (accounts.length < 6) return;
  const insert = db.prepare(
    'INSERT INTO transactions (from_asset_id, to_asset_id, amount, occurred_at, fir_id) VALUES (?, ?, ?, ?, NULL)'
  );

  // Normal transfers
  for (let i = 0; i < 120; i += 1) {
    const from = rng.pick(accounts).id;
    let to = rng.pick(accounts).id;
    while (to === from) to = rng.pick(accounts).id;
    insert.run(from, to, rng.int(500, 90000), randomDate(rng).iso);
  }

  // Layering rings: circular chains typical of money laundering
  for (let ring = 0; ring < 3; ring += 1) {
    const chain = Array.from({ length: 4 }, () => rng.pick(accounts).id);
    const amount = rng.int(200000, 900000);
    const { iso } = randomDate(rng);
    for (let step = 0; step < chain.length; step += 1) {
      const from = chain[step];
      const to = chain[(step + 1) % chain.length];
      if (from !== to) insert.run(from, to, amount * (1 - step * 0.02), iso);
    }
  }
  void assetsByPerson;
}

export function isSeeded(db: Database): boolean {
  const row = db.prepare('SELECT COUNT(*) AS count FROM firs').get() as { count: number };
  return row.count > 0;
}

/** Live workspace: stations are reference infrastructure, not mock case data. */
export function seedStationsOnly(db: Database): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM stations').get() as { count: number };
  if (row.count === 0) {
    seedStations(db, createRng(SEED));
  }
}

/** Clears every table and reseeds the full synthetic dataset (demo reset). */
export function resetDemoData(db: Database): void {
  const wipe = db.transaction(() => {
    for (const table of [
      'transactions', 'fir_assets', 'fir_accused', 'fir_victims',
      'assets', 'firs', 'persons', 'stations', 'audit_log',
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  });
  wipe();
  seedDatabase(db);
}

export function seedDatabase(db: Database): void {
  const rng = createRng(SEED);
  const seedAll = db.transaction(() => {
    seedStations(db, rng);
    const stationRows = db
      .prepare('SELECT id, name, district, lat, lon FROM stations')
      .all() as Array<{ id: number; name: string; district: string; lat: number; lon: number }>;
    const personIds = seedPersons(db, rng);
    const gangs = buildGangs(rng, personIds);
    const assetsByPerson = seedAssets(db, rng, personIds);
    seedFirs(db, { rng, stationRows, personIds, gangs, assetsByPerson });
    seedTransactions(db, rng, assetsByPerson);
  });
  seedAll();
}
