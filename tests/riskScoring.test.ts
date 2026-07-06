import { describe, expect, test } from 'vitest';
import { computeRiskScore } from '@/lib/intel/riskScoring';

describe('computeRiskScore (E3)', () => {
  test('categorizes a prolific, connected, recently active offender as High', () => {
    // Arrange
    const inputs = {
      priorOffenses: 8,
      networkDegree: 10,
      daysSinceLastCase: 10,
      crimeTypeCount: 4,
    };

    // Act
    const result = computeRiskScore(inputs);

    // Assert
    expect(result.category).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  test('categorizes a one-time dormant offender as Low', () => {
    const result = computeRiskScore({
      priorOffenses: 1,
      networkDegree: 0,
      daysSinceLastCase: 400,
      crimeTypeCount: 1,
    });

    expect(result.category).toBe('Low');
  });

  test('score is bounded between 0 and 100 even with extreme inputs', () => {
    const result = computeRiskScore({
      priorOffenses: 999,
      networkDegree: 999,
      daysSinceLastCase: 0,
      crimeTypeCount: 99,
    });

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('returns per-factor contributions for explainability (I2)', () => {
    const result = computeRiskScore({
      priorOffenses: 4,
      networkDegree: 5,
      daysSinceLastCase: 100,
      crimeTypeCount: 2,
    });

    expect(result.factors).toHaveLength(4);
    const total = result.factors.reduce((sum, factor) => sum + factor.contribution, 0);
    expect(Math.round(total)).toBe(result.score);
  });

  test('more prior offenses never lowers the score', () => {
    const base = { networkDegree: 3, daysSinceLastCase: 60, crimeTypeCount: 2 };

    const fewer = computeRiskScore({ ...base, priorOffenses: 2 });
    const more = computeRiskScore({ ...base, priorOffenses: 6 });

    expect(more.score).toBeGreaterThan(fewer.score);
  });
});
