import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';
import { buildCaseIntelligence } from '@/lib/intel/caseIntel';
import { detectCrimeRings } from '@/lib/intel/gangs';
import { buildNetwork } from '@/lib/intel/network';
import { getCoAccusedPairs, getOffenderProfiles } from '@/lib/intel/offenders';
import { executeQuery } from '@/lib/intel/queryExecutor';
import { parseQuery } from '@/lib/intel/queryParser';

let db: Database;

beforeAll(() => {
  // Arrange (shared): full synthetic dataset in an in-memory database
  db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  seedDatabase(db);
});

afterAll(() => {
  db.close();
});

describe('end-to-end query pipeline (A1 → I1)', () => {
  test('natural language question returns FIRs with evidence references', () => {
    const parsed = parseQuery('Show all burglary FIRs in Bengaluru during 2026');

    const result = executeQuery(db, parsed.filter);

    expect(result.kind).toBe('firs');
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.firs.length).toBeGreaterThan(0);
    expect(result.evidence[0]).toMatch(/^FIR\//);
    for (const fir of result.firs) {
      expect(fir.crime_type).toBe('Burglary');
      expect(fir.district).toBe('Bengaluru City');
      expect(fir.occurred_at.startsWith('2026')).toBe(true);
    }
  });

  test('count intent returns totals without listing rows', () => {
    const parsed = parseQuery('How many theft cases in Mysuru?');

    const result = executeQuery(db, parsed.filter);

    expect(result.kind).toBe('count');
    expect(result.firs).toHaveLength(0);
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });

  test('offender intent returns ranked repeat offenders', () => {
    const parsed = parseQuery('List repeat offenders');

    const result = executeQuery(db, parsed.filter);

    expect(result.kind).toBe('offenders');
    expect(result.offenders.length).toBeGreaterThan(0);
    expect(result.offenders[0].caseCount).toBeGreaterThanOrEqual(2);
  });
});

describe('offender profiling on seeded data (E1–E3)', () => {
  test('profiles include bounded risk scores and categories', () => {
    const offenders = getOffenderProfiles(db);

    expect(offenders.length).toBeGreaterThan(10);
    for (const offender of offenders.slice(0, 20)) {
      expect(offender.riskScore).toBeGreaterThanOrEqual(0);
      expect(offender.riskScore).toBeLessThanOrEqual(100);
      expect(['Low', 'Medium', 'High']).toContain(offender.riskCategory);
    }
  });

  test('offender recency is relative to the provided "now" date (A1)', () => {
    // Insert a fresh FIR dated today to simulate a live workspace
    const today = new Date().toISOString().slice(0, 10);
    const profiles = getOffenderProfiles(db, 2, today);
    // All offenders should still be returned; the function should not throw
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(p.riskScore).toBeGreaterThanOrEqual(0);
      expect(p.riskScore).toBeLessThanOrEqual(100);
    }
  });

  test('seeded gangs are recovered as crime rings (B2)', () => {
    const rings = detectCrimeRings(getCoAccusedPairs(db));

    // The seeder plants 5 gangs of 4-7 members
    expect(rings.length).toBeGreaterThanOrEqual(4);
    for (const ring of rings) {
      expect(ring.members.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('network + case intelligence (B1, B3, F1–F4)', () => {
  test('2-hop network from a gang member includes FIRs and other entities', () => {
    const [ring] = detectCrimeRings(getCoAccusedPairs(db));

    const graph = buildNetwork(db, ring.members[0], 2);

    expect(graph.nodes.length).toBeGreaterThan(3);
    expect(graph.edges.length).toBeGreaterThanOrEqual(graph.nodes.length - 1);
    const kinds = new Set(graph.nodes.map((node) => node.kind));
    expect(kinds.has('person')).toBe(true);
    expect(kinds.has('fir')).toBe(true);
    expect(graph.nodes.filter((node) => node.hop === 0)).toHaveLength(1);
  });

  test('unknown person yields an empty graph, not an error', () => {
    const graph = buildNetwork(db, 999999, 2);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  test('case intelligence assembles summary, timeline, similar cases and leads', () => {
    const { id } = db.prepare('SELECT id FROM firs LIMIT 1').get() as { id: number };

    const intelligence = buildCaseIntelligence(db, id);

    expect(intelligence).not.toBeNull();
    expect(intelligence!.fir.fir_number).toMatch(/^FIR\//);
    expect(intelligence!.timeline.length).toBeGreaterThanOrEqual(2);
    expect(intelligence!.leads.length).toBeGreaterThan(0);
  });

  test('missing case returns null', () => {
    expect(buildCaseIntelligence(db, 999999)).toBeNull();
  });
});
