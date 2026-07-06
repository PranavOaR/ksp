import { CRIME_TYPES, DISTRICTS } from '../constants';
import type { ParsedQuery, QueryFilter, QueryIntent } from './types';

const DISTRICT_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru City',
  bengaluru: 'Bengaluru City',
  mysore: 'Mysuru',
  mangalore: 'Mangaluru',
  hubli: 'Hubballi-Dharwad',
  dharwad: 'Hubballi-Dharwad',
  gulbarga: 'Kalaburagi',
  bellary: 'Ballari',
  shimoga: 'Shivamogga',
  belgaum: 'Belagavi',
  tumkur: 'Tumakuru',
};

const CRIME_KEYWORDS: Array<{ keywords: string[]; crimeType: string }> = [
  { keywords: ['vehicle theft', 'bike theft', 'car theft'], crimeType: 'Vehicle Theft' },
  { keywords: ['chain snatching', 'snatching'], crimeType: 'Chain Snatching' },
  { keywords: ['cybercrime', 'cyber crime', 'online fraud', 'phishing', 'otp'], crimeType: 'Cybercrime' },
  { keywords: ['drug', 'narcotic'], crimeType: 'Drug Trafficking' },
  { keywords: ['burglary', 'burglaries', 'break-in', 'house break'], crimeType: 'Burglary' },
  { keywords: ['murder', 'homicide'], crimeType: 'Murder' },
  { keywords: ['assault'], crimeType: 'Assault' },
  { keywords: ['extortion'], crimeType: 'Extortion' },
  { keywords: ['fraud', 'scam', 'cheating'], crimeType: 'Fraud' },
  { keywords: ['theft', 'thefts', 'stolen', 'robbery'], crimeType: 'Theft' },
];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const REFINEMENT_PREFIXES = ['only', 'just', 'now ', 'what about', 'and ', 'filter'];

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function detectCrimeType(text: string, matched: string[]): string | undefined {
  for (const { keywords, crimeType } of CRIME_KEYWORDS) {
    const hit = keywords.find((keyword) => text.includes(keyword));
    if (hit) {
      matched.push(`Crime type "${crimeType}" (from "${hit}")`);
      return crimeType;
    }
  }
  return undefined;
}

function detectDistrict(text: string, matched: string[]): string | undefined {
  for (const district of DISTRICTS) {
    if (text.includes(district.toLowerCase())) {
      matched.push(`District "${district}"`);
      return district;
    }
  }
  for (const [alias, district] of Object.entries(DISTRICT_ALIASES)) {
    if (text.includes(alias)) {
      const resolved =
        district === 'Bengaluru City' && text.includes('rural') ? 'Bengaluru Rural' : district;
      matched.push(`District "${resolved}" (from "${alias}")`);
      return resolved;
    }
  }
  return undefined;
}

function detectStatus(text: string, matched: string[]): string | undefined {
  if (text.includes('under investigation')) {
    matched.push('Status "Under Investigation"');
    return 'Under Investigation';
  }
  if (text.includes('unsolved') || text.includes('pending') || text.includes('open case')) {
    matched.push('Status "Open"');
    return 'Open';
  }
  if (text.includes('solved') || text.includes('closed')) {
    matched.push('Status "Solved"');
    return 'Solved';
  }
  return undefined;
}

function detectDateRange(
  text: string,
  matched: string[]
): { fromDate?: string; toDate?: string } {
  const monthIndex = MONTHS.findIndex((month) => text.includes(month));
  const yearMatch = text.match(/\b(20\d{2})\b/);

  if (monthIndex >= 0 && yearMatch) {
    const year = Number(yearMatch[1]);
    const month = monthIndex + 1;
    const mm = String(month).padStart(2, '0');
    matched.push(`Period ${MONTHS[monthIndex]} ${year}`);
    return {
      fromDate: `${year}-${mm}-01`,
      toDate: `${year}-${mm}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`,
    };
  }
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    matched.push(`Period year ${year}`);
    return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
  }
  return {};
}

function detectIntent(text: string, matched: string[]): QueryIntent {
  if (text.includes('repeat offender') || text.includes('habitual') || text.includes('offenders')) {
    matched.push('Intent: repeat offender lookup');
    return 'listOffenders';
  }
  if (text.includes('how many') || text.includes('count') || text.includes('number of')) {
    matched.push('Intent: count');
    return 'count';
  }
  if (text.includes('trend') || text.includes('forecast') || text.includes('over time')) {
    matched.push('Intent: trend analysis');
    return 'trend';
  }
  matched.push('Intent: list matching FIRs');
  return 'listFirs';
}

function isRefinementQuery(text: string, hasNewSubject: boolean): boolean {
  const trimmed = text.trim();
  if (REFINEMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return true;
  return !hasNewSubject && trimmed.split(/\s+/).length <= 6;
}

/**
 * Deterministic natural-language → structured query translation with
 * conversational context retention (PRD features A1 + A2).
 */
export function parseQuery(rawText: string, previous?: QueryFilter): ParsedQuery {
  const text = rawText.toLowerCase();
  const matched: string[] = [];

  const crimeType = detectCrimeType(text, matched);
  const district = detectDistrict(text, matched);
  const status = detectStatus(text, matched);
  const { fromDate, toDate } = detectDateRange(text, matched);
  const intent = detectIntent(text, matched);

  const hasNewSubject = Boolean(crimeType || district);
  const isRefinement = Boolean(previous) && isRefinementQuery(text, hasNewSubject);

  const base: QueryFilter = isRefinement && previous ? previous : { intent: 'listFirs' };
  const filter: QueryFilter = {
    ...base,
    intent: intent === 'listFirs' && isRefinement ? base.intent : intent,
    ...(crimeType ? { crimeType } : {}),
    ...(district ? { district } : {}),
    ...(status ? { status } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const signalCount = [crimeType, district, status, fromDate].filter(Boolean).length;
  const confidence = Math.min(0.95, 0.4 + signalCount * 0.15 + (isRefinement ? 0.1 : 0));

  return { filter, matched, isRefinement, confidence };
}

/** Sanity guard: crime type values must always come from the known list. */
export function isKnownCrimeType(value: string): boolean {
  return (CRIME_TYPES as readonly string[]).includes(value);
}
