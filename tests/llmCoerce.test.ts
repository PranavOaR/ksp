import { describe, expect, test } from 'vitest';
import { coerceLlmParse } from '@/lib/intel/llmCoerce';

const baseOutput = {
  intent: 'listFirs',
  crimeType: null,
  district: null,
  status: null,
  fromDate: null,
  toDate: null,
  isRefinement: false,
  language: 'en',
  understood: [],
};

describe('coerceLlmParse — validating untrusted model output', () => {
  test('passes through valid fields', () => {
    // Arrange
    const raw = {
      ...baseOutput,
      crimeType: 'Burglary',
      district: 'Mysuru',
      status: 'Solved',
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
      understood: ['Crime type Burglary'],
    };

    // Act
    const result = coerceLlmParse(raw);

    // Assert
    expect(result.filter.crimeType).toBe('Burglary');
    expect(result.filter.district).toBe('Mysuru');
    expect(result.filter.status).toBe('Solved');
    expect(result.filter.fromDate).toBe('2026-03-01');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('drops hallucinated crime types and districts', () => {
    const result = coerceLlmParse({
      ...baseOutput,
      crimeType: 'Time Travel Fraud',
      district: 'Gotham City',
    });

    expect(result.filter.crimeType).toBeUndefined();
    expect(result.filter.district).toBeUndefined();
  });

  test('drops malformed dates', () => {
    const result = coerceLlmParse({
      ...baseOutput,
      fromDate: 'March 2026',
      toDate: '2026-3-1',
    });

    expect(result.filter.fromDate).toBeUndefined();
    expect(result.filter.toDate).toBeUndefined();
  });

  test('refinement merges with previous filter', () => {
    const previous = { intent: 'listFirs' as const, crimeType: 'Theft', district: 'Mysuru' };

    const result = coerceLlmParse(
      { ...baseOutput, status: 'Solved', isRefinement: true },
      previous
    );

    expect(result.filter.crimeType).toBe('Theft');
    expect(result.filter.district).toBe('Mysuru');
    expect(result.filter.status).toBe('Solved');
    expect(result.isRefinement).toBe(true);
  });

  test('isRefinement is ignored when there is no previous context', () => {
    const result = coerceLlmParse({ ...baseOutput, isRefinement: true });

    expect(result.isRefinement).toBe(false);
  });

  test('unknown language falls back to English', () => {
    const result = coerceLlmParse({ ...baseOutput, language: 'klingon' });

    expect(result.language).toBe('en');
  });

  test('kannada language is preserved', () => {
    const result = coerceLlmParse({ ...baseOutput, language: 'kn' });

    expect(result.language).toBe('kn');
  });

  test('invalid intent falls back to listFirs', () => {
    const result = coerceLlmParse({ ...baseOutput, intent: 'deleteEverything' });

    expect(result.filter.intent).toBe('listFirs');
  });
});
