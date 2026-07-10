import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { beforeAll, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';
import { parseQuery } from '@/lib/intel/queryParser';
import { executeQuery, findPersonCandidates } from '@/lib/intel/queryExecutor';

let db: Database;
let knownRepeatOffender: { name: string; personId: number };
let knownFirNumber: string;

beforeAll(() => {
  db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  seedDatabase(db);

  // A person with several cases whose name is unique in the dataset —
  // stable because seeding is deterministic.
  knownRepeatOffender = db
    .prepare(
      `SELECT p.name, p.id AS personId FROM persons p
       JOIN fir_accused fa ON fa.person_id = p.id
       WHERE (SELECT COUNT(*) FROM persons p2 WHERE p2.name LIKE '%' || p.name || '%') = 1
       GROUP BY p.id HAVING COUNT(fa.fir_id) >= 3
       ORDER BY COUNT(fa.fir_id) DESC LIMIT 1`
    )
    .get() as { name: string; personId: number };
  knownFirNumber = (
    db.prepare('SELECT fir_number FROM firs WHERE id = 1').get() as { fir_number: string }
  ).fir_number;
});

describe('NL expansion — rule engine → executor round trips', () => {
  test('personProfile: "who is <name>" returns a risk profile with case evidence', () => {
    const parsed = parseQuery(`Who is ${knownRepeatOffender.name}?`);
    expect(parsed.filter.intent).toBe('personProfile');
    expect(parsed.filter.personName).toBe(knownRepeatOffender.name);

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('profile');
    expect(result.profile?.personId).toBe(knownRepeatOffender.personId);
    expect(result.profile?.riskCategory).toMatch(/Low|Medium|High/);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.summary).toContain(knownRepeatOffender.name);
  });

  test('personProfile: unknown name gives a friendly miss, not a crash', () => {
    const result = executeQuery(db, parseQuery('Who is Zzyzx Quokkason?').filter);
    expect(result.kind).toBe('noMatch');
    expect(result.summary).toContain('Zzyzx Quokkason');
  });

  test('personProfile: ambiguous name returns a candidate list', () => {
    // "Ravi" prefixes many seeded names — guaranteed ambiguous.
    const candidates = findPersonCandidates(db, 'Ravi');
    expect(candidates.length).toBeGreaterThan(1);

    const result = executeQuery(db, { intent: 'personProfile', personName: 'Ravi' });
    expect(result.kind).toBe('candidates');
    expect(result.candidates?.length).toBeGreaterThan(1);
  });

  test('networkQuery: "who is linked to <name>" summarizes the 2-hop graph', () => {
    const parsed = parseQuery(`Who is linked to ${knownRepeatOffender.name}?`);
    expect(parsed.filter.intent).toBe('networkQuery');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('network');
    expect(result.network?.nodeCount).toBeGreaterThan(1);
    expect(result.network?.personName).toBe(knownRepeatOffender.name);
  });

  test('caseDetail: a real FIR number returns full case intelligence', () => {
    const parsed = parseQuery(`Show me ${knownFirNumber}`);
    expect(parsed.filter.intent).toBe('caseDetail');
    expect(parsed.filter.firNumber).toBe(knownFirNumber);

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('caseDetail');
    expect(result.caseIntel?.fir.fir_number).toBe(knownFirNumber);
    expect(result.caseIntel?.timeline.length).toBeGreaterThan(0);
  });

  test('caseDetail: the official 18-digit CrimeNo also resolves', () => {
    const crimeNo = (
      db.prepare('SELECT crime_no FROM firs WHERE id = 1').get() as { crime_no: string }
    ).crime_no;
    const parsed = parseQuery(`Case ${crimeNo} details`);
    expect(parsed.filter.intent).toBe('caseDetail');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('caseDetail');
    expect(result.caseIntel?.fir.id).toBe(1);
  });

  test('actSection: "cases under BNS 303" finds charged cases with the section text', () => {
    const parsed = parseQuery('Show cases under BNS 303');
    expect(parsed.filter.intent).toBe('actSection');
    expect(parsed.filter.actCode).toBe('BNS');
    expect(parsed.filter.sectionCode).toBe('303');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('actSection');
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.actSection?.sectionDescription).toContain('theft');
  });

  test('actSection: bare "section 66C" defaults to searching an act', () => {
    const parsed = parseQuery('cybercrime cases under section 66C');
    expect(parsed.filter.sectionCode).toBe('66C');
  });

  test('financialSummary: "show the money trail" reports rings and volume', () => {
    const parsed = parseQuery('Show me the money trail and suspicious transactions');
    expect(parsed.filter.intent).toBe('financialSummary');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('financial');
    expect(result.financial?.ringCount).toBeGreaterThan(0);
    expect(result.financial?.flaggedVolume).toBeGreaterThan(0);
  });

  test('hotspotQuery: "where are theft hotspots" ranks districts with growth flags', () => {
    const parsed = parseQuery('Where are the theft hotspots right now?');
    expect(parsed.filter.intent).toBe('hotspotQuery');
    expect(parsed.filter.crimeType).toBe('Theft');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('hotspots');
    expect(result.hotspots?.length).toBeGreaterThan(0);
    expect(result.summary).toContain('hotspot');
  });

  test('moKeyword: "lock-picking cases" filters by modus operandi', () => {
    const parsed = parseQuery('Show lock-picking cases in Mysuru');
    expect(parsed.filter.moKeyword).toBe('Lock-picking of parked vehicles');
    expect(parsed.filter.district).toBe('Mysuru');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('firs');
    for (const fir of result.firs) {
      expect(fir.modus_operandi).toBe('Lock-picking of parked vehicles');
    }
  });

  test('investigate: "investigate <name>" degrades to a profile without the agent', () => {
    const parsed = parseQuery(`Investigate ${knownRepeatOffender.name}`);
    expect(parsed.filter.intent).toBe('investigate');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('profile');
    expect(result.profile?.personId).toBe(knownRepeatOffender.personId);
  });

  test('legacy intents are untouched: count query still counts', () => {
    const parsed = parseQuery('How many burglary cases in Belagavi?');
    expect(parsed.filter.intent).toBe('count');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('count');
    expect(result.totalCount).toBeGreaterThan(0);
  });
});
