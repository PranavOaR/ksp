import type { CensusDistrict } from '../data/census';

export interface DistrictSociologyProfile {
  district: string;
  population: number;
  crimeCount: number;
  /** Crimes per 100,000 residents. */
  crimeRatePer100k: number;
  literacyPct: number;
  urbanizationPct: number;
  /** Weighted social-risk score 0–100. Higher = more concerning socioeconomic pattern. */
  socialRiskScore: number;
  socialRiskCategory: 'Low' | 'Medium' | 'High';
}

export interface SociologyResult {
  profiles: DistrictSociologyProfile[];
  /** Pearson r between crimeRatePer100k and literacyPct across all districts. */
  pearsonCrimeLiteracy: number;
  /** Pearson r between crimeRatePer100k and urbanizationPct across all districts. */
  pearsonCrimeUrbanization: number;
}

/**
 * Pearson product-moment correlation coefficient between two numeric arrays.
 * Returns 0 when the arrays are too short (< 2 elements) or have zero variance.
 */
export function pearsonCorrelation(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return 0;

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let covariance = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    covariance += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  if (denom === 0) return 0;
  return Math.round((covariance / denom) * 1000) / 1000;
}

/**
 * Computes a social-risk score (0–100) for a district based on crime rate,
 * literacy, and urbanisation. Higher crime rate and lower literacy increase
 * the score. Urbanisation is treated as a mild amplifier.
 *
 * Weights: crimeRate 50%, low-literacy 30%, urbanisation 20%.
 * All inputs are normalised against plausible Karnataka ranges before scoring.
 */
export function computeSocialRisk(
  crimeRatePer100k: number,
  literacyPct: number,
  urbanizationPct: number
): { socialRiskScore: number; socialRiskCategory: 'Low' | 'Medium' | 'High' } {
  const CRIME_RATE_CAP = 200; // plausible upper bound per 100k
  const crimeComponent = Math.min(crimeRatePer100k / CRIME_RATE_CAP, 1) * 50;
  // Lower literacy → higher risk
  const literacyComponent = Math.max(0, 1 - literacyPct / 100) * 30;
  // Higher urbanisation → mild additional risk (density effect)
  const urbanComponent = Math.min(urbanizationPct / 100, 1) * 20;

  const rawScore = crimeComponent + literacyComponent + urbanComponent;
  const socialRiskScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  const socialRiskCategory =
    socialRiskScore >= 60 ? 'High' : socialRiskScore >= 30 ? 'Medium' : 'Low';

  return { socialRiskScore, socialRiskCategory };
}

/**
 * Joins live crime counts with static Census data to produce per-district
 * enriched profiles, then computes Pearson correlations for crime vs
 * literacy and crime vs urbanisation (Module D).
 */
export function correlateCrimeWithCensus(
  districtCrimeCounts: ReadonlyArray<{ district: string; crimeCount: number }>,
  censusData: readonly CensusDistrict[]
): SociologyResult {
  const crimeMap = new Map(
    districtCrimeCounts.map((row) => [row.district, row.crimeCount])
  );

  const profiles: DistrictSociologyProfile[] = censusData.map((c) => {
    const crimeCount = crimeMap.get(c.district) ?? 0;
    const crimeRatePer100k =
      c.population > 0 ? Math.round((crimeCount / c.population) * 100_000 * 10) / 10 : 0;
    const { socialRiskScore, socialRiskCategory } = computeSocialRisk(
      crimeRatePer100k,
      c.literacyPct,
      c.urbanizationPct
    );
    return {
      district: c.district,
      population: c.population,
      crimeCount,
      crimeRatePer100k,
      literacyPct: c.literacyPct,
      urbanizationPct: c.urbanizationPct,
      socialRiskScore,
      socialRiskCategory,
    };
  });

  const rates = profiles.map((p) => p.crimeRatePer100k);
  const literacies = profiles.map((p) => p.literacyPct);
  const urbanizations = profiles.map((p) => p.urbanizationPct);

  return {
    profiles,
    pearsonCrimeLiteracy: pearsonCorrelation(rates, literacies),
    pearsonCrimeUrbanization: pearsonCorrelation(rates, urbanizations),
  };
}
