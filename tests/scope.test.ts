import { describe, expect, test } from 'vitest';
import { applyJurisdiction } from '@/lib/scope';
import type { QueryFilter } from '@/lib/intel/types';

const psiSession = {
  jurisdictionDistrict: 'Bengaluru City',
  unitName: 'Bengaluru City East PS',
};
const dgpSession = { jurisdictionDistrict: null, unitName: 'Karnataka State Police HQ' };

describe('applyJurisdiction (Module J1 — rank/unit RBAC)', () => {
  test('statewide postings are never scoped', () => {
    const filter: QueryFilter = { intent: 'listFirs', crimeType: 'Theft' };
    const result = applyJurisdiction(filter, dgpSession);
    expect(result.filter).toEqual(filter);
    expect(result.scopeNote).toBeNull();
  });

  test('district-posted officer gets an unfiltered query scoped with a visible note', () => {
    const result = applyJurisdiction({ intent: 'listFirs', crimeType: 'Theft' }, psiSession);
    expect(result.filter.district).toBe('Bengaluru City');
    expect(result.scopeNote).toContain('Scoped to your jurisdiction: Bengaluru City');
  });

  test('asking about another district is answered within jurisdiction and explained', () => {
    const result = applyJurisdiction(
      { intent: 'count', crimeType: 'Theft', district: 'Mysuru' },
      psiSession
    );
    expect(result.filter.district).toBe('Bengaluru City');
    expect(result.scopeNote).toContain('does not cover Mysuru');
  });

  test('a query already inside the jurisdiction is untouched, no note', () => {
    const filter: QueryFilter = { intent: 'listFirs', district: 'Bengaluru City' };
    const result = applyJurisdiction(filter, psiSession);
    expect(result.filter).toEqual(filter);
    expect(result.scopeNote).toBeNull();
  });

  test('entity-level intents (network, investigate, legal) are never district-scoped', () => {
    for (const intent of ['networkQuery', 'investigate', 'financialSummary', 'legalQuestion', 'caseDetail'] as const) {
      const filter: QueryFilter = { intent, personName: 'Ravi' };
      const result = applyJurisdiction(filter, psiSession);
      expect(result.filter.district, intent).toBeUndefined();
      expect(result.scopeNote, intent).toBeNull();
    }
  });

  test('scoping returns a new filter object (no mutation)', () => {
    const filter: QueryFilter = { intent: 'listFirs' };
    const result = applyJurisdiction(filter, psiSession);
    expect(result.filter).not.toBe(filter);
    expect(filter.district).toBeUndefined();
  });
});
