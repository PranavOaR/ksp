import { describe, expect, test } from 'vitest';
import { parseQuery } from '@/lib/intel/queryParser';

describe('parseQuery — natural language understanding (A1)', () => {
  test('extracts crime type, district, and month range from PRD example', () => {
    // Arrange
    const text = 'Show all burglary FIRs in Bengaluru during March 2026';

    // Act
    const { filter, confidence } = parseQuery(text);

    // Assert
    expect(filter.crimeType).toBe('Burglary');
    expect(filter.district).toBe('Bengaluru City');
    expect(filter.fromDate).toBe('2026-03-01');
    expect(filter.toDate).toBe('2026-03-31');
    expect(filter.intent).toBe('listFirs');
    expect(confidence).toBeGreaterThan(0.7);
  });

  test('detects repeat offender intent for cybercrime', () => {
    const { filter } = parseQuery('List repeat offenders involved in cybercrime');

    expect(filter.intent).toBe('listOffenders');
    expect(filter.crimeType).toBe('Cybercrime');
  });

  test('resolves common district aliases like Mysore', () => {
    const { filter } = parseQuery('theft cases in mysore');

    expect(filter.district).toBe('Mysuru');
    expect(filter.crimeType).toBe('Theft');
  });

  test('maps year-only mention to a full-year range', () => {
    const { filter } = parseQuery('murder cases in 2025');

    expect(filter.fromDate).toBe('2025-01-01');
    expect(filter.toDate).toBe('2025-12-31');
  });

  test('detects count intent', () => {
    const { filter } = parseQuery('How many vehicle theft cases in Ballari?');

    expect(filter.intent).toBe('count');
    expect(filter.crimeType).toBe('Vehicle Theft');
    expect(filter.district).toBe('Ballari');
  });
});

describe('parseQuery — context retention (A2)', () => {
  test('refinement merges with previous filter (PRD example)', () => {
    // Arrange: first question establishes context
    const first = parseQuery('Show theft cases in Mysuru');

    // Act: follow-up refines it
    const second = parseQuery('Only solved cases', first.filter);

    // Assert: previous crime type and district are retained
    expect(second.isRefinement).toBe(true);
    expect(second.filter.crimeType).toBe('Theft');
    expect(second.filter.district).toBe('Mysuru');
    expect(second.filter.status).toBe('Solved');
  });

  test('a fresh subject starts a new query instead of refining', () => {
    const first = parseQuery('Show theft cases in Mysuru');

    const second = parseQuery('Show all murder FIRs registered in Belagavi this year', first.filter);

    expect(second.isRefinement).toBe(false);
    expect(second.filter.crimeType).toBe('Murder');
    expect(second.filter.district).toBe('Belagavi');
    expect(second.filter.status).toBeUndefined();
  });

  test('returns a reasoning trail for explainability (I2)', () => {
    const { matched } = parseQuery('burglary in Tumakuru');

    expect(matched.some((entry) => entry.includes('Burglary'))).toBe(true);
    expect(matched.some((entry) => entry.includes('Tumakuru'))).toBe(true);
  });
});
