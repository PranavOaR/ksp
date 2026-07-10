import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { beforeAll, describe, expect, test } from 'vitest';
import { SCHEMA_SQL } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';
import { composeExtractiveAnswer, retrieveLegal, toFtsQuery } from '@/lib/intel/knowledge';
import { executeQuery } from '@/lib/intel/queryExecutor';
import { parseQuery } from '@/lib/intel/queryParser';

let db: Database;

beforeAll(() => {
  db = new DatabaseConstructor(':memory:');
  db.exec(SCHEMA_SQL);
  seedDatabase(db);
});

describe('knowledge base retrieval (RAG-lite, Module A6)', () => {
  test('the seeded KB contains sections and SOPs', () => {
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM kb_docs').get() as {
      count: number;
    };
    expect(count).toBeGreaterThanOrEqual(25);
    const sops = db
      .prepare("SELECT COUNT(*) AS count FROM kb_docs WHERE source = 'SOP'")
      .get() as { count: number };
    expect(sops.count).toBeGreaterThanOrEqual(5);
  });

  test('toFtsQuery strips stop words and quotes content words', () => {
    expect(toFtsQuery('What section applies to chain snatching?')).toBe('"chain" OR "snatching"');
    expect(toFtsQuery('the a is')).toBe('');
  });

  test('snatching question retrieves BNS §304 as the top passage', () => {
    const passages = retrieveLegal(db, 'What section applies to chain snatching?');
    expect(passages.length).toBeGreaterThan(0);
    expect(passages[0].title).toContain('§304');
  });

  test('OTP fraud question retrieves the IT Act personation provision', () => {
    const passages = retrieveLegal(db, 'punishment for OTP fraud impersonating bank staff');
    const titles = passages.map((passage) => passage.title).join(' | ');
    expect(titles).toContain('66D');
  });

  test('procedure question retrieves the matching SOP', () => {
    const passages = retrieveLegal(db, 'What is the procedure for NDPS seizure sampling?');
    expect(passages.some((passage) => passage.source === 'SOP')).toBe(true);
  });

  test('gibberish returns an empty result and a helpful extractive answer', () => {
    const passages = retrieveLegal(db, 'zzz qqqq xyzzy');
    expect(passages).toHaveLength(0);
    expect(composeExtractiveAnswer(passages)).toContain('No matching provisions');
  });

  test('end to end: parser routes legal questions to the knowledge branch', () => {
    const parsed = parseQuery('What section applies to chain snatching?');
    expect(parsed.filter.intent).toBe('legalQuestion');
    expect(parsed.filter.kbQuery).toBe('What section applies to chain snatching?');

    const result = executeQuery(db, parsed.filter);
    expect(result.kind).toBe('knowledge');
    expect(result.knowledge?.length).toBeGreaterThan(0);
    expect(result.summary).toContain('§304');
    expect(result.evidence[0]).toContain('BNS');
  });

  test('actSection listing still wins when a section NUMBER is given', () => {
    const parsed = parseQuery('Show cases under BNS 303');
    expect(parsed.filter.intent).toBe('actSection');
  });
});
