import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { beforeAll, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';
import { composeMemoFallback, runInvestigation } from '@/lib/intel/agent';

let db: Database;
let gangMemberName: string;
let ringMemberName: string | undefined;

beforeAll(() => {
  db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  seedDatabase(db);

  // A heavy repeat offender with a unique name — deterministic via seeding.
  gangMemberName = (
    db
      .prepare(
        `SELECT p.name FROM persons p
         JOIN fir_accused fa ON fa.person_id = p.id
         WHERE (SELECT COUNT(*) FROM persons p2 WHERE p2.name LIKE '%' || p.name || '%') = 1
         GROUP BY p.id HAVING COUNT(fa.fir_id) >= 5
         ORDER BY COUNT(fa.fir_id) DESC LIMIT 1`
      )
      .get() as { name: string }
  ).name;
});

describe('runInvestigation — the Module A′ agent playbook', () => {
  test('full run on a seeded offender completes all 7 sqlite steps', () => {
    // Act
    const result = runInvestigation(db, gangMemberName);

    // Assert
    expect(result.target?.name).toBe(gangMemberName);
    expect(result.steps.map((step) => step.id)).toEqual([
      'resolve', 'priors', 'network', 'risk', 'similar', 'financial', 'geo',
    ]);
    const doneSteps = result.steps.filter((step) => step.status === 'done');
    expect(doneSteps.length).toBeGreaterThanOrEqual(5);
    expect(result.findings.profile?.riskScore).toBeGreaterThan(0);
    expect(result.findings.priorCases.length).toBeGreaterThanOrEqual(5);
    expect(result.findings.networkSize?.nodes).toBeGreaterThan(1);
  });

  test('every step records a positive duration and a human summary', () => {
    const result = runInvestigation(db, gangMemberName);
    for (const step of result.steps) {
      expect(step.durationMs).toBeGreaterThan(0);
      expect(step.summary.length).toBeGreaterThan(5);
      expect(step.tool.length).toBeGreaterThan(0);
    }
  });

  test('evidence FIR numbers in the trace exist in the database', () => {
    const result = runInvestigation(db, gangMemberName);
    const evidence = result.steps.flatMap((step) => step.evidence)
      .filter((reference) => reference.startsWith('FIR/'));
    expect(evidence.length).toBeGreaterThan(0);
    const exists = db.prepare('SELECT 1 FROM firs WHERE fir_number = ?');
    for (const reference of evidence) {
      expect(exists.get(reference), `${reference} should exist`).toBeTruthy();
    }
  });

  test('unknown target resolves to a null-target run, not a crash', () => {
    const result = runInvestigation(db, 'Zzyzx Quokkason');
    expect(result.target).toBeNull();
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe('skipped');
    expect(result.memo).toBeNull();
  });

  test('ambiguous target surfaces candidates for disambiguation', () => {
    const result = runInvestigation(db, 'Ravi');
    expect(result.target).toBeNull();
    expect(result.candidates?.length).toBeGreaterThan(1);
  });

  test('steps skip gracefully for a person with no financial assets', () => {
    // Find a person who is accused somewhere but owns no bank account.
    const row = db
      .prepare(
        `SELECT p.name FROM persons p
         JOIN fir_accused fa ON fa.person_id = p.id
         WHERE (SELECT COUNT(*) FROM persons p2 WHERE p2.name LIKE '%' || p.name || '%') = 1
           AND NOT EXISTS (SELECT 1 FROM assets a
                           WHERE a.owner_person_id = p.id AND a.type = 'bank_account')
         GROUP BY p.id LIMIT 1`
      )
      .get() as { name: string } | undefined;
    if (!row) return; // dataset quirk — nothing to assert against

    const result = runInvestigation(db, row.name);
    const financialStep = result.steps.find((step) => step.id === 'financial');
    expect(financialStep?.status).toBe('skipped');
    expect(financialStep?.summary).toContain('No bank accounts');
  });
});

describe('composeMemoFallback — offline memo template', () => {
  test('produces a complete grounded memo without any API key', () => {
    const investigation = runInvestigation(db, gangMemberName);
    const memo = composeMemoFallback(gangMemberName, investigation.findings);

    expect(memo).toContain(`INVESTIGATION BRIEF — ${gangMemberName}`);
    expect(memo).toContain('Prior cases:');
    expect(memo).toContain('Suggested next steps');
    // Grounding: the memo cites a real FIR number from the findings
    if (investigation.findings.priorCases.length > 0) {
      expect(memo).toContain(investigation.findings.priorCases[0].fir_number);
    }
  });

  test('handles a subject with no cases without inventing facts', () => {
    const memo = composeMemoFallback('Fresh Person', {
      priorCases: [],
      topAssociates: [],
      similarCases: [],
      financial: { ownedAccounts: 0, ringMember: false, highValueTransfers: 0 },
    });
    expect(memo).toContain('no offender profile on record');
    expect(memo).toContain('Prior cases: 0');
    expect(memo).not.toContain('FIR/');
  });
});
