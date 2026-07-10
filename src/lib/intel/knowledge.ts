import type { Database } from 'better-sqlite3';

/**
 * RAG-lite retrieval (Module A6): bm25-ranked full-text search over the
 * legal knowledge base (act/section texts + SOPs) in SQLite FTS5. Pure
 * retrieval — answer composition happens at the caller with the passages
 * as ground truth, or extractively when no LLM is available.
 */

export interface KnowledgePassage {
  source: string;
  title: string;
  /** Query-relevant snippet with … ellipses (no markup). */
  snippet: string;
  content: string;
}

const RESULT_LIMIT = 5;
const SNIPPET_TOKENS = 40;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'do', 'does', 'did', 'can', 'could', 'shall',
  'should', 'will', 'would', 'to', 'of', 'for', 'in', 'on', 'at', 'by', 'with',
  'about', 'under', 'and', 'or', 'not', 'case', 'cases', 'section', 'sections',
  'applies', 'apply', 'applicable', 'law', 'legal', 'me', 'tell', 'show',
]);

/** Turns a natural question into a safe FTS5 OR-query of content words. */
export function toFtsQuery(question: string): string {
  const words = (question.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => word.length >= 3 && !STOP_WORDS.has(word)
  );
  return [...new Set(words)].map((word) => `"${word}"`).join(' OR ');
}

export function retrieveLegal(db: Database, question: string): KnowledgePassage[] {
  const ftsQuery = toFtsQuery(question);
  if (!ftsQuery) return [];
  return db
    .prepare(
      `SELECT d.source, d.title, d.content,
              snippet(kb_fts, 1, '', '', '…', ${SNIPPET_TOKENS}) AS snippet
       FROM kb_fts JOIN kb_docs d ON d.id = kb_fts.rowid
       WHERE kb_fts MATCH ?
       ORDER BY bm25(kb_fts) LIMIT ${RESULT_LIMIT}`
    )
    .all(ftsQuery) as KnowledgePassage[];
}

/** Deterministic extractive answer when the LLM path is unavailable. */
export function composeExtractiveAnswer(passages: KnowledgePassage[]): string {
  if (passages.length === 0) {
    return 'No matching provisions found in the legal knowledge base. Try naming the offence or act.';
  }
  const [top, ...rest] = passages;
  const also =
    rest.length > 0 ? ` See also: ${rest.map((passage) => passage.title).join('; ')}.` : '';
  return `${top.title}: ${top.content}${also}`;
}
