import type { SessionUser } from './auth';
import type { QueryFilter } from './intel/types';

/**
 * Jurisdiction scoping (Module J1): officers with a district-bound posting
 * get their data access scoped to that district; SCRB/HQ postings are
 * statewide. Bounded enforcement — applied on the Copilot and the case
 * list; aggregate intelligence products (analytics, map) stay statewide by
 * design since they are command-level views.
 */

export interface ScopedFilter {
  filter: QueryFilter;
  /** Reasoning-trail line when scoping changed the query, else null. */
  scopeNote: string | null;
}

/** Intents that operate on cross-district entities and are never scoped. */
const UNSCOPED_INTENTS: ReadonlyArray<QueryFilter['intent']> = [
  'networkQuery', 'investigate', 'financialSummary', 'legalQuestion', 'caseDetail',
];

export function applyJurisdiction(
  filter: QueryFilter,
  session: Pick<SessionUser, 'jurisdictionDistrict' | 'unitName'>
): ScopedFilter {
  const jurisdiction = session.jurisdictionDistrict;
  if (!jurisdiction) return { filter, scopeNote: null };
  if (UNSCOPED_INTENTS.includes(filter.intent)) return { filter, scopeNote: null };
  if (filter.district === jurisdiction) return { filter, scopeNote: null };

  if (filter.district && filter.district !== jurisdiction) {
    // Asked for another district: answer within jurisdiction and say so.
    return {
      filter: { ...filter, district: jurisdiction },
      scopeNote: `Scoped to your jurisdiction: ${jurisdiction} (your posting at ${session.unitName} does not cover ${filter.district}).`,
    };
  }
  return {
    filter: { ...filter, district: jurisdiction },
    scopeNote: `Scoped to your jurisdiction: ${jurisdiction}.`,
  };
}
