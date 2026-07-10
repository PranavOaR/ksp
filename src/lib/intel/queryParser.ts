import { CRIME_TYPES, DISTRICTS } from '../constants';
import type { ParsedQuery, QueryFilter, QueryIntent } from './types';

/** Legacy FIR/2026/BEN/0001 or the official 18-digit CrimeNo. */
const FIR_NUMBER_PATTERN = /\bfir\/\d{4}\/[a-z]{3}\/\d{4}\b/i;
const CRIME_NO_PATTERN = /\b\d{18}\b/;
const SECTION_PATTERN = /(?:section|sec\.?|u\/s|§)\s*(\d{1,4}[a-z]?)\b/i;
/** "under BNS 303", "IT Act 66C", "NDPS 20" — act name directly before a number. */
const ACT_SECTION_PATTERN = /\b(bns|ipc|it\s*act|ndps|arms\s*act)\s*(?:section\s*)?(\d{1,4}[a-z]?)\b/i;

const ACT_ALIASES: Record<string, string> = {
  bns: 'BNS',
  // The dataset is charged under BNS 2023 (IPC's successor) — treat IPC
  // mentions as BNS so pre-2023 phrasing still finds the right cases.
  ipc: 'BNS',
  'it act': 'ITACT',
  itact: 'ITACT',
  ndps: 'NDPS',
  'arms act': 'ARMS',
};

/**
 * Phrases that precede a person's name in investigator questions. The name
 * capture runs on the RAW text so display casing is preserved.
 */
const NAME_TRIGGERS = [
  'investigate',
  'investigation brief on',
  'brief on',
  'full workup on',
  'profile of',
  'profile for',
  'who is',
  'priors of',
  'priors for',
  'history of',
  'record of',
  'cases involving',
  'cases against',
  'linked to',
  'connected to',
  'associates of',
  'network of',
  'network around',
] as const;

/**
 * Distinctive MO phrase fragments → the seeded MODUS_OPERANDI entry.
 * Only fragments that do NOT double as crime-type keywords (so "otp fraud"
 * stays a Cybercrime signal rather than an MO filter).
 */
const MO_FRAGMENTS: Array<{ fragment: string; mo: string }> = [
  { fragment: 'rear entry', mo: 'Night-time break-in via rear entry' },
  { fragment: 'night-time break', mo: 'Night-time break-in via rear entry' },
  { fragment: 'drive-by', mo: 'Two-wheeler drive-by snatching' },
  { fragment: 'lock-picking', mo: 'Lock-picking of parked vehicles' },
  { fragment: 'lock picking', mo: 'Lock-picking of parked vehicles' },
  { fragment: 'service staff', mo: 'Daytime entry posing as service staff' },
  { fragment: 'threat calls', mo: 'Threat calls demanding payment' },
  { fragment: 'advance-fee', mo: 'Fake job offer advance-fee scam' },
  { fragment: 'fake job', mo: 'Fake job offer advance-fee scam' },
  { fragment: 'knife-point', mo: 'Knife-point street robbery' },
  { fragment: 'knife point', mo: 'Knife-point street robbery' },
  { fragment: 'courier parcel', mo: 'Courier parcel scam' },
];

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

/**
 * Extracts the person name after a trigger phrase from the RAW (cased)
 * text: up to four capitalized-or-plain words, stopping at punctuation or
 * filler words. Returns undefined when nothing name-like follows.
 */
function detectPersonName(rawText: string, matched: string[]): string | undefined {
  const lower = rawText.toLowerCase();
  // The name follows the LAST trigger in the sentence ("who is linked to
  // Ravi" must extract after "linked to", not after "who is").
  const hits = NAME_TRIGGERS
    .map((trigger) => ({ trigger, index: lower.indexOf(trigger) }))
    .filter((hit) => hit.index !== -1)
    .sort((a, b) => b.index - a.index);
  for (const { trigger, index } of hits) {
    const tail = rawText.slice(index + trigger.length);
    const nameMatch = tail.match(/^[\s:,-]*([A-Za-z][A-Za-z.']*(?:\s+[A-Za-z][A-Za-z.']*){0,3})/);
    if (!nameMatch) continue;
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'of', 'for', 'with', 'cases', 'case', 'district', 'this', 'that',
    ]);
    const words = nameMatch[1]
      .split(/\s+/)
      .filter((word) => !stopWords.has(word.toLowerCase()));
    if (words.length === 0) continue;
    const name = words.slice(0, 4).join(' ').replace(/[.,;!?]+$/, '');
    if (name.length < 2) continue;
    matched.push(`Person "${name}" (after "${trigger}")`);
    return name;
  }
  return undefined;
}

function detectFirNumber(rawText: string, matched: string[]): string | undefined {
  const legacy = rawText.match(FIR_NUMBER_PATTERN);
  if (legacy) {
    matched.push(`Case number ${legacy[0].toUpperCase()}`);
    return legacy[0].toUpperCase();
  }
  const official = rawText.match(CRIME_NO_PATTERN);
  if (official) {
    matched.push(`Official CrimeNo ${official[0]}`);
    return official[0];
  }
  return undefined;
}

function detectActSection(
  text: string,
  matched: string[]
): { actCode?: string; sectionCode?: string } {
  const actSection = text.match(ACT_SECTION_PATTERN);
  if (actSection) {
    const actCode = ACT_ALIASES[actSection[1].replace(/\s+/g, ' ').trim()] ?? 'BNS';
    const sectionCode = actSection[2].toUpperCase();
    matched.push(`Legal section ${actCode} ${sectionCode}`);
    return { actCode, sectionCode };
  }
  const section = text.match(SECTION_PATTERN);
  if (section) {
    const sectionCode = section[1].toUpperCase();
    matched.push(`Legal section ${sectionCode} (act unspecified, assuming BNS)`);
    return { actCode: 'BNS', sectionCode };
  }
  return {};
}

function detectMoKeyword(text: string, matched: string[]): string | undefined {
  for (const { fragment, mo } of MO_FRAGMENTS) {
    if (text.includes(fragment)) {
      matched.push(`Modus operandi "${mo}" (from "${fragment}")`);
      return mo;
    }
  }
  return undefined;
}

interface IntentSignals {
  personName?: string;
  firNumber?: string;
  sectionCode?: string;
}

function detectIntent(text: string, signals: IntentSignals, matched: string[]): QueryIntent {
  if (
    signals.personName &&
    (text.includes('investigate') || text.includes('brief on') || text.includes('full workup'))
  ) {
    matched.push('Intent: autonomous investigation brief');
    return 'investigate';
  }
  if (
    signals.personName &&
    (text.includes('network') || text.includes('linked to') ||
      text.includes('connected to') || text.includes('associates'))
  ) {
    matched.push('Intent: network expansion');
    return 'networkQuery';
  }
  if (signals.personName) {
    matched.push('Intent: person profile lookup');
    return 'personProfile';
  }
  if (signals.firNumber) {
    matched.push('Intent: case detail');
    return 'caseDetail';
  }
  if (signals.sectionCode) {
    matched.push('Intent: cases by legal section');
    return 'actSection';
  }
  if (
    text.includes('money trail') || text.includes('launder') ||
    text.includes('circular transfer') || text.includes('suspicious transaction') ||
    text.includes('suspicious transfer') || text.includes('money flow') ||
    text.includes('transactions')
  ) {
    matched.push('Intent: financial summary');
    return 'financialSummary';
  }
  if (
    text.includes('hotspot') || text.includes('hot spot') || text.includes('density') ||
    text.includes('concentration') || (text.includes('where') && text.includes('most'))
  ) {
    matched.push('Intent: hotspot analysis');
    return 'hotspotQuery';
  }
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
  const personName = detectPersonName(rawText, matched);
  const firNumber = detectFirNumber(rawText, matched);
  const { actCode, sectionCode } = detectActSection(text, matched);
  const moKeyword = detectMoKeyword(text, matched);
  const intent = detectIntent(text, { personName, firNumber, sectionCode }, matched);

  const hasNewSubject = Boolean(crimeType || district || personName || firNumber || sectionCode || moKeyword);
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
    ...(personName ? { personName } : {}),
    ...(firNumber ? { firNumber } : {}),
    ...(actCode ? { actCode } : {}),
    ...(sectionCode ? { sectionCode } : {}),
    ...(moKeyword ? { moKeyword } : {}),
  };

  const signalCount = [
    crimeType, district, status, fromDate, personName, firNumber, sectionCode, moKeyword,
  ].filter(Boolean).length;
  const confidence = Math.min(0.95, 0.4 + signalCount * 0.15 + (isRefinement ? 0.1 : 0));

  return { filter, matched, isRefinement, confidence };
}

/** Sanity guard: crime type values must always come from the known list. */
export function isKnownCrimeType(value: string): boolean {
  return (CRIME_TYPES as readonly string[]).includes(value);
}
