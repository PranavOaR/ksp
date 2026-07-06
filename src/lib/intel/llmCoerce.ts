import { CRIME_TYPES, DISTRICTS, FIR_STATUSES } from '../constants';
import type { ParsedQuery, QueryFilter, QueryIntent } from './types';

export type CopilotLanguage = 'en' | 'kn';

export interface LlmParseOutput {
  intent: string;
  crimeType: string | null;
  district: string | null;
  status: string | null;
  fromDate: string | null;
  toDate: string | null;
  isRefinement: boolean;
  language: string;
  understood: string[];
}

const INTENTS: readonly QueryIntent[] = ['listFirs', 'listOffenders', 'count', 'trend'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function keepIfValid<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function keepIfDate(value: string | null): string | undefined {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

/**
 * Never trust model output blindly (input validation at the boundary):
 * every enum value is checked against the known lists and dates against
 * ISO format before the filter reaches SQL. Invalid fields are dropped,
 * falling back to the merged/previous context.
 */
export function coerceLlmParse(
  raw: LlmParseOutput,
  previous?: QueryFilter
): ParsedQuery & { language: CopilotLanguage } {
  const intent = keepIfValid(raw.intent, INTENTS) ?? 'listFirs';
  const isRefinement = Boolean(previous) && raw.isRefinement;
  const base: QueryFilter = isRefinement && previous ? previous : { intent };

  const crimeType = keepIfValid(raw.crimeType, CRIME_TYPES);
  const district = keepIfValid(raw.district, DISTRICTS);
  const status = keepIfValid(raw.status, FIR_STATUSES);
  const fromDate = keepIfDate(raw.fromDate);
  const toDate = keepIfDate(raw.toDate);

  const filter: QueryFilter = {
    ...base,
    intent,
    ...(crimeType ? { crimeType } : {}),
    ...(district ? { district } : {}),
    ...(status ? { status } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const signalCount = [crimeType, district, status, fromDate].filter(Boolean).length;
  const confidence = Math.min(0.98, 0.55 + signalCount * 0.12 + (isRefinement ? 0.08 : 0));

  return {
    filter,
    matched: raw.understood.slice(0, 8),
    isRefinement,
    confidence,
    language: raw.language === 'kn' ? 'kn' : 'en',
  };
}
