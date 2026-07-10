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
  personName?: string | null;
  firNumber?: string | null;
  actCode?: string | null;
  sectionCode?: string | null;
  moKeyword?: string | null;
  isRefinement: boolean;
  language: string;
  understood: string[];
}

const INTENTS: readonly QueryIntent[] = [
  'listFirs', 'listOffenders', 'count', 'trend',
  'personProfile', 'caseDetail', 'networkQuery', 'financialSummary',
  'actSection', 'hotspotQuery', 'investigate',
];
const ACT_CODES = ['BNS', 'ITACT', 'NDPS', 'ARMS'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FIR_NUMBER_PATTERN = /^(FIR\/\d{4}\/[A-Z]{3}\/\d{4}|\d{18})$/i;
const SECTION_PATTERN = /^\d{1,4}[A-Z]?$/i;

/** Person names reach SQL LIKE queries — trim, strip quotes, cap length. */
function keepIfName(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/["'`]/g, '').trim();
  return cleaned.length >= 2 && cleaned.length <= 80 ? cleaned : undefined;
}

function keepIfFirNumber(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  return FIR_NUMBER_PATTERN.test(cleaned) ? cleaned : undefined;
}

function keepIfSection(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  return SECTION_PATTERN.test(cleaned) ? cleaned : undefined;
}

function keepIfMoKeyword(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/["'`]/g, '').trim();
  return cleaned.length >= 3 && cleaned.length <= 60 ? cleaned : undefined;
}

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
  const personName = keepIfName(raw.personName);
  const firNumber = keepIfFirNumber(raw.firNumber);
  const sectionCode = keepIfSection(raw.sectionCode);
  const actCode =
    keepIfValid(raw.actCode ?? null, ACT_CODES) ?? (sectionCode ? 'BNS' : undefined);
  const moKeyword = keepIfMoKeyword(raw.moKeyword);

  // Person/case/section intents are meaningless without their subject —
  // if the model named an intent but the subject failed validation, fall
  // back to a plain listing rather than executing a broken filter.
  const subjectByIntent: Partial<Record<QueryIntent, unknown>> = {
    personProfile: personName,
    networkQuery: personName,
    investigate: personName,
    caseDetail: firNumber,
    actSection: sectionCode,
  };
  const requiredSubject = subjectByIntent[intent];
  const safeIntent: QueryIntent =
    intent in subjectByIntent && !requiredSubject ? 'listFirs' : intent;

  const filter: QueryFilter = {
    ...base,
    intent: safeIntent,
    ...(crimeType ? { crimeType } : {}),
    ...(district ? { district } : {}),
    ...(status ? { status } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(personName ? { personName } : {}),
    ...(firNumber ? { firNumber } : {}),
    ...(actCode ? { actCode } : {}),
    ...(sectionCode ? { sectionCode } : {}),
    ...(moKeyword ? { moKeyword } : {}),
  };

  const signalCount = [
    crimeType, district, status, fromDate, personName, firNumber, sectionCode, moKeyword,
  ].filter(Boolean).length;
  const confidence = Math.min(0.98, 0.55 + signalCount * 0.12 + (isRefinement ? 0.08 : 0));

  return {
    filter,
    matched: raw.understood.slice(0, 8),
    isRefinement,
    confidence,
    language: raw.language === 'kn' ? 'kn' : 'en',
  };
}
