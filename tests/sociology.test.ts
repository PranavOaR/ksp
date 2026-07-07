import { describe, expect, test } from 'vitest';
import { CENSUS_DATA } from '@/lib/data/census';
import {
  pearsonCorrelation,
  computeSocialRisk,
  correlateCrimeWithCensus,
} from '@/lib/intel/sociology';

describe('pearsonCorrelation (Module D)', () => {
  test('returns +1 for perfectly positively correlated data', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 3);
  });

  test('returns −1 for perfectly negatively correlated data', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 3);
  });

  test('returns 0 (or near 0) for uncorrelated data', () => {
    // Constant ys have zero variance → r = 0
    expect(pearsonCorrelation([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0);
  });

  test('returns 0 when fewer than 2 data points are provided', () => {
    expect(pearsonCorrelation([42], [42])).toBe(0);
    expect(pearsonCorrelation([], [])).toBe(0);
  });

  test('returns 0 when array lengths differ', () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2])).toBe(0);
  });
});

describe('computeSocialRisk (Module D)', () => {
  test('high crime rate + low literacy → High category', () => {
    const result = computeSocialRisk(180, 50, 30);
    expect(result.socialRiskCategory).toBe('High');
    expect(result.socialRiskScore).toBeGreaterThanOrEqual(60);
  });

  test('low crime rate + high literacy → Low category', () => {
    const result = computeSocialRisk(5, 95, 20);
    expect(result.socialRiskCategory).toBe('Low');
    expect(result.socialRiskScore).toBeLessThan(30);
  });

  test('score is bounded between 0 and 100 with extreme inputs', () => {
    const high = computeSocialRisk(9999, 0, 100);
    expect(high.socialRiskScore).toBeLessThanOrEqual(100);
    expect(high.socialRiskScore).toBeGreaterThanOrEqual(0);
    const low = computeSocialRisk(0, 100, 0);
    expect(low.socialRiskScore).toBeLessThanOrEqual(100);
    expect(low.socialRiskScore).toBeGreaterThanOrEqual(0);
  });
});

describe('correlateCrimeWithCensus (Module D)', () => {
  test('produces one profile per census district', () => {
    const counts = CENSUS_DATA.map((c) => ({ district: c.district, crimeCount: 50 }));
    const result = correlateCrimeWithCensus(counts, CENSUS_DATA);
    expect(result.profiles).toHaveLength(CENSUS_DATA.length);
  });

  test('districts with no FIRs get crimeCount 0 and crimeRatePer100k 0', () => {
    const result = correlateCrimeWithCensus([], CENSUS_DATA);
    for (const profile of result.profiles) {
      expect(profile.crimeCount).toBe(0);
      expect(profile.crimeRatePer100k).toBe(0);
    }
  });

  test('pearsonCrimeLiteracy is a number in −1..1 range', () => {
    const counts = CENSUS_DATA.map((c, i) => ({ district: c.district, crimeCount: i * 10 }));
    const result = correlateCrimeWithCensus(counts, CENSUS_DATA);
    expect(result.pearsonCrimeLiteracy).toBeGreaterThanOrEqual(-1);
    expect(result.pearsonCrimeLiteracy).toBeLessThanOrEqual(1);
  });

  test('pearsonCrimeUrbanization is a number in −1..1 range', () => {
    const counts = CENSUS_DATA.map((c, i) => ({ district: c.district, crimeCount: i * 10 }));
    const result = correlateCrimeWithCensus(counts, CENSUS_DATA);
    expect(result.pearsonCrimeUrbanization).toBeGreaterThanOrEqual(-1);
    expect(result.pearsonCrimeUrbanization).toBeLessThanOrEqual(1);
  });
});
