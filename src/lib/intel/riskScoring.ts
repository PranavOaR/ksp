import { RISK_THRESHOLDS } from '../constants';

export interface RiskInputs {
  /** Number of FIRs the person is accused in. */
  priorOffenses: number;
  /** Distinct co-accused across all cases (network influence). */
  networkDegree: number;
  /** Days since the person's most recent case. */
  daysSinceLastCase: number;
  /** Distinct crime types (versatility correlates with recidivism). */
  crimeTypeCount: number;
}

export interface RiskResult {
  score: number;
  category: 'Low' | 'Medium' | 'High';
  factors: Array<{ label: string; contribution: number }>;
}

const WEIGHTS = {
  priorOffenses: 40,
  networkDegree: 25,
  recency: 20,
  versatility: 15,
} as const;

const PRIOR_OFFENSES_CAP = 8;
const NETWORK_DEGREE_CAP = 10;
const RECENCY_WINDOW_DAYS = 365;
const CRIME_TYPE_CAP = 4;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Explainable offender risk score (PRD E3): weighted blend of prior offenses,
 * network influence, recency of activity, and crime-type versatility.
 * Returns per-factor contributions so the UI can show the reasoning trail.
 */
export function computeRiskScore(inputs: RiskInputs): RiskResult {
  const priorFactor = clamp01(inputs.priorOffenses / PRIOR_OFFENSES_CAP);
  const networkFactor = clamp01(inputs.networkDegree / NETWORK_DEGREE_CAP);
  const recencyFactor = clamp01(1 - inputs.daysSinceLastCase / RECENCY_WINDOW_DAYS);
  const versatilityFactor = clamp01((inputs.crimeTypeCount - 1) / (CRIME_TYPE_CAP - 1));

  const factors = [
    { label: 'Prior offenses', contribution: priorFactor * WEIGHTS.priorOffenses },
    { label: 'Network influence', contribution: networkFactor * WEIGHTS.networkDegree },
    { label: 'Recent activity', contribution: recencyFactor * WEIGHTS.recency },
    { label: 'Crime versatility', contribution: versatilityFactor * WEIGHTS.versatility },
  ].map((factor) => ({ ...factor, contribution: Math.round(factor.contribution * 10) / 10 }));

  const score = Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0));
  const category =
    score >= RISK_THRESHOLDS.HIGH ? 'High' : score >= RISK_THRESHOLDS.MEDIUM ? 'Medium' : 'Low';

  return { score, category, factors };
}
