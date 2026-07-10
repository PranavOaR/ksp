import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { CRIME_TYPES, DATASET_END, DATASET_START, DISTRICTS, FIR_STATUSES } from '../constants';
import { coerceLlmParse, type CopilotLanguage } from './llmCoerce';
import type { InvestigationFindings } from './agent';
import type { FirRecord, OffenderProfile, ParsedQuery, QueryFilter } from './types';

const MODEL = 'claude-haiku-4-5';
const PARSE_MAX_TOKENS = 1024;
const COMPOSE_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 20_000;

let cachedClient: Anthropic | null = null;

export function isLlmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  }
  return cachedClient;
}

const ParseSchema = z.object({
  intent: z.enum([
    'listFirs', 'listOffenders', 'count', 'trend',
    'personProfile', 'caseDetail', 'networkQuery', 'financialSummary',
    'actSection', 'hotspotQuery', 'investigate', 'legalQuestion',
  ]),
  crimeType: z.enum(CRIME_TYPES).nullable(),
  district: z.enum(DISTRICTS).nullable(),
  status: z.enum(FIR_STATUSES).nullable(),
  fromDate: z.string().nullable().describe('ISO date YYYY-MM-DD, or null'),
  toDate: z.string().nullable().describe('ISO date YYYY-MM-DD, or null'),
  personName: z
    .string()
    .nullable()
    .describe('Person the question is about, in Latin script, or null'),
  firNumber: z
    .string()
    .nullable()
    .describe('Specific case number mentioned (FIR/YYYY/XXX/0000 or 18-digit CrimeNo), or null'),
  actCode: z
    .enum(['BNS', 'ITACT', 'NDPS', 'ARMS'])
    .nullable()
    .describe('Legal act when a section is mentioned; IPC maps to BNS'),
  sectionCode: z.string().nullable().describe('Legal section number like 303 or 66C, or null'),
  moKeyword: z
    .string()
    .nullable()
    .describe('Modus operandi phrase the user is searching for, or null'),
  kbQuery: z
    .string()
    .nullable()
    .describe('For legalQuestion only: the legal question restated in English for retrieval'),
  isRefinement: z
    .boolean()
    .describe('true when the message refines the previous query instead of starting a new one'),
  language: z.enum(['en', 'kn']).describe('Language the user wrote in'),
  understood: z
    .array(z.string())
    .describe('Short English notes on what was extracted, for the audit reasoning trail'),
});

const PARSE_SYSTEM = `You translate natural-language questions from Karnataka State Police investigators into structured crime-database query filters. Questions may be in English or Kannada (ಕನ್ನಡ).

Database facts:
- Crime types: ${CRIME_TYPES.join(', ')}
- Districts: ${DISTRICTS.join(', ')} (map aliases: Bangalore/ಬೆಂಗಳೂರು→Bengaluru City, Mysore/ಮೈಸೂರು→Mysuru, Mangalore→Mangaluru, Hubli→Hubballi-Dharwad, Gulbarga→Kalaburagi, Bellary→Ballari, Shimoga→Shivamogga, Belgaum→Belagavi, Tumkur→Tumakuru)
- Case statuses: ${FIR_STATUSES.join(', ')}
- Records span ${DATASET_START} to ${DATASET_END}.

Rules:
- Map Kannada crime words to the English enum values (e.g. ಕಳ್ಳತನ→Theft, ಕೊಲೆ→Murder, ದರೋಡೆ→Burglary, ಸೈಬರ್ ಅಪರಾಧ→Cybercrime, ವಂಚನೆ→Fraud).
- Intent selection:
  - "investigate" when asked for an investigation brief / full workup on a named person ("Investigate Ravi Kumar", "ರವಿ ಕುಮಾರ್ ಬಗ್ಗೆ ತನಿಖಾ ವರದಿ ಕೊಡಿ") — also set personName.
  - "networkQuery" for associates/connections/network questions about a person ("who is linked to Salim Khan") — also set personName.
  - "personProfile" for who-is/priors/history questions about a person — also set personName.
  - "caseDetail" when a specific case number is mentioned — also set firNumber.
  - "actSection" for listing CASES charged under a specific section ("cases under BNS 303", "IPC 302 cases" → actCode BNS, sectionCode 303/103) — also set actCode + sectionCode.
  - "legalQuestion" for questions about the LAW or PROCEDURE itself ("what section applies to chain snatching?", "punishment for OTP fraud", "procedure for NDPS seizure", "ಸರಪಳಿ ಕಳ್ಳತನಕ್ಕೆ ಯಾವ ಸೆಕ್ಷನ್?") — set kbQuery to the question restated in English.
  - "financialSummary" for money-trail / suspicious-transaction / laundering questions.
  - "hotspotQuery" for hotspot / crime-density / where-is-crime-concentrated questions.
  - "listOffenders" for repeat/habitual offender questions, "count" for how-many questions, "trend" for trend/forecast questions, otherwise "listFirs".
- Person names: keep in Latin script, strip honorifics (Mr/Shri), null if no person is named.
- If a previous filter is provided and the new message narrows it (e.g. "only solved cases"), set isRefinement true and output only the newly mentioned fields.
- Leave fields null when the user did not mention them.`;

export async function llmParseQuery(
  message: string,
  previous?: QueryFilter
): Promise<ParsedQuery & { language: CopilotLanguage }> {
  const client = getClient();
  const previousContext = previous
    ? `Previous query filter (for refinement context): ${JSON.stringify(previous)}`
    : 'No previous query in this conversation.';

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: PARSE_MAX_TOKENS,
    // Haiku 4.5 does not support the effort parameter — omit it
    output_config: { format: zodOutputFormat(ParseSchema) },
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: `${previousContext}\n\nInvestigator message: ${message}` }],
  });

  if (!response.parsed_output) {
    throw new Error('LLM returned unparseable output');
  }
  return coerceLlmParse(response.parsed_output, previous);
}

/**
 * Composes the final investigator-facing answer in the user's language
 * (Kannada support, PRD A3). Only invoked for non-English conversations —
 * English answers come from the deterministic summary for zero added latency.
 */
export async function llmComposeAnswer(input: {
  question: string;
  language: CopilotLanguage;
  summary: string;
  firs: FirRecord[];
  offenders: OffenderProfile[];
  totalCount: number;
}): Promise<string> {
  const client = getClient();
  const facts = {
    totalCount: input.totalCount,
    summary: input.summary,
    sampleFirs: input.firs.slice(0, 5).map((fir) => ({
      firNumber: fir.fir_number,
      crimeType: fir.crime_type,
      district: fir.district,
      date: fir.occurred_at.slice(0, 10),
      status: fir.status,
    })),
    sampleOffenders: input.offenders.slice(0, 5).map((offender) => ({
      name: offender.name,
      cases: offender.caseCount,
      risk: offender.riskCategory,
    })),
  };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: COMPOSE_MAX_TOKENS,
    system:
      'You are DRISHTI, the Karnataka State Police crime intelligence copilot. Answer the investigator in simple, natural Kannada (ಕನ್ನಡ) in 1-3 sentences using ONLY the provided database facts. State the count and key findings factually — no opinions, warnings or recommendations. Keep FIR numbers, person names, and crime type terms (Theft, Burglary, Cybercrime etc.) in English/Latin script within the Kannada sentence. No markdown formatting.',
    messages: [
      {
        role: 'user',
        content: `Question: ${input.question}\n\nDatabase results (ground truth): ${JSON.stringify(facts)}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || !('text' in textBlock) || !textBlock.text.trim()) {
    throw new Error('LLM compose returned no text');
  }
  return textBlock.text.trim();
}

/**
 * Knowledge-base answer composition (Module A6): answers a legal/procedure
 * question grounded STRICTLY on the retrieved passages, with citations.
 */
export async function llmComposeLegal(input: {
  question: string;
  passages: Array<{ source: string; title: string; content: string }>;
  language: CopilotLanguage;
}): Promise<string> {
  const client = getClient();
  const languageRule =
    input.language === 'kn'
      ? 'Answer in natural Kannada (ಕನ್ನಡ), keeping act names and section numbers in English/Latin script.'
      : 'Answer in clear, plain English.';

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: COMPOSE_MAX_TOKENS,
    system: `You are DRISHTI's legal knowledge assistant for Karnataka State Police investigators. Answer using ONLY the retrieved legal provisions provided — if they do not cover the question, say so plainly. Cite every provision you rely on by its title (e.g. "BNS §304"). 2-4 sentences, factual, no legal advice disclaimer. PLAIN TEXT ONLY — no markdown of any kind (no **, no #, no bullets). ${languageRule}`,
    messages: [
      {
        role: 'user',
        content: `Question: ${input.question}\n\nRetrieved provisions (ground truth): ${JSON.stringify(input.passages)}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || !('text' in textBlock) || !textBlock.text.trim()) {
    throw new Error('LLM legal compose returned no text');
  }
  return textBlock.text.trim();
}

/**
 * Drafts the investigation lead memo (Module A′ step 8), grounded STRICTLY
 * on the agent's structured findings. Callers fall back to the
 * deterministic template in agent.ts when this throws or no key is set.
 */
export async function llmComposeMemo(input: {
  targetName: string;
  findings: InvestigationFindings;
  language: CopilotLanguage;
}): Promise<string> {
  const client = getClient();
  const languageRule =
    input.language === 'kn'
      ? 'Write in natural Kannada (ಕನ್ನಡ), keeping FIR numbers, names and crime-type terms in English/Latin script.'
      : 'Write in clear, plain English.';

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: COMPOSE_MAX_TOKENS,
    system: `You are DRISHTI's investigation agent drafting a lead memo for a Karnataka State Police investigator. Use ONLY the structured findings provided — never invent facts, names, or case numbers. Structure: subject line, 2-4 short factual paragraphs (priors, network, financial, geography — omit empty areas), then 2-3 concrete suggested next steps drawn from the findings. Cite FIR numbers inline as evidence. PLAIN TEXT ONLY — no markdown of any kind (no **, no #, no bullets), no disclaimers. ${languageRule}`,
    messages: [
      {
        role: 'user',
        content: `Target: ${input.targetName}\n\nAgent findings (ground truth): ${JSON.stringify(input.findings)}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || !('text' in textBlock) || !textBlock.text.trim()) {
    throw new Error('LLM memo compose returned no text');
  }
  return textBlock.text.trim();
}
