import type { Database } from 'better-sqlite3';
import { buildCaseIntelligence } from './caseIntel';
import { buildMoneyTrail } from './financial';
import { buildNetwork } from './network';
import { getOffenderProfiles } from './offenders';
import { findPersonCandidates } from './queryExecutor';
import type { FirRecord, OffenderProfile, PersonCandidate } from './types';

/**
 * Module A′ — Investigation Agent. One NL request ("Investigate Ravi
 * Kumar") autonomously chains the platform's intel tools and drafts a lead
 * memo. Every step is failure-isolated and emits an explainable trace with
 * FIR-number evidence (Module I); the whole run is plain SQLite except the
 * optional memo composition, so it fits comfortably inside a 30s request.
 */

export interface AgentStep {
  id: string;
  title: string;
  /** The intel module the step invoked — shown in the trace UI. */
  tool: string;
  status: 'done' | 'skipped';
  durationMs: number;
  summary: string;
  evidence: string[];
}

export interface InvestigationResult {
  target: { personId: number; name: string } | null;
  steps: AgentStep[];
  /** Structured facts the memo is grounded on (also used by tests). */
  findings: InvestigationFindings;
  /** Null when the target could not be resolved. */
  memo: string | null;
  candidates?: PersonCandidate[];
}

export interface InvestigationFindings {
  profile?: OffenderProfile;
  priorCases: FirRecord[];
  networkSize?: { nodes: number; edges: number };
  topAssociates: Array<{ personId: number; name: string; sharedCases: number }>;
  similarCases: Array<{ fir_number: string; crime_type: string; district: string }>;
  financial: {
    ownedAccounts: number;
    ringMember: boolean;
    highValueTransfers: number;
  };
  homeDistrictRank?: { district: string; rank: number; totalDistricts: number };
}

type StepRunner = () => { summary?: string; evidence?: string[]; skip?: string };

function runStep(steps: AgentStep[], id: string, title: string, tool: string, run: StepRunner): void {
  const startedAt = performance.now();
  try {
    const output = run();
    steps.push({
      id,
      title,
      tool,
      status: output.skip ? 'skipped' : 'done',
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      summary: output.skip ?? output.summary ?? '',
      evidence: output.evidence ?? [],
    });
  } catch (error) {
    steps.push({
      id,
      title,
      tool,
      status: 'skipped',
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      summary: `Step failed safely: ${error instanceof Error ? error.message : 'unknown error'}`,
      evidence: [],
    });
  }
}

function firsForPerson(db: Database, personId: number): FirRecord[] {
  return db
    .prepare(
      `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
              f.description, f.modus_operandi, f.occurred_at, f.status
       FROM firs f
       JOIN fir_accused fa ON fa.fir_id = f.id AND fa.person_id = ?
       JOIN stations s ON s.id = f.station_id
       ORDER BY f.occurred_at DESC`
    )
    .all(personId) as FirRecord[];
}

/** Deterministic memo used when no API key is configured (offline demo). */
export function composeMemoFallback(
  targetName: string,
  findings: InvestigationFindings
): string {
  const profile = findings.profile;
  const lines: string[] = [
    `INVESTIGATION BRIEF — ${targetName}`,
    profile
      ? `Subject: ${profile.name}, ${profile.age}, ${profile.district}. Risk ${profile.riskCategory} (${profile.riskScore}/100).`
      : `Subject: ${targetName} — no offender profile on record.`,
    `Prior cases: ${findings.priorCases.length}` +
      (findings.priorCases.length > 0
        ? ` (${[...new Set(findings.priorCases.map((fir) => fir.crime_type))].join(', ')}); most recent ${findings.priorCases[0].fir_number} on ${findings.priorCases[0].occurred_at.slice(0, 10)}.`
        : '.'),
    findings.topAssociates.length > 0
      ? `Known associates: ${findings.topAssociates
          .map((associate) => `${associate.name} (${associate.sharedCases} shared cases)`)
          .join(', ')}.`
      : 'No co-accused associates on record.',
    findings.similarCases.length > 0
      ? `Similar-MO cases worth cross-checking: ${findings.similarCases
          .slice(0, 3)
          .map((c) => c.fir_number)
          .join(', ')}.`
      : 'No similar-MO cases found.',
    findings.financial.ringMember
      ? `FINANCIAL FLAG: subject's accounts participate in a circular-transfer ring; ${findings.financial.highValueTransfers} high-value transfer(s) recorded. Recommend FCU referral.`
      : `Financial: ${findings.financial.ownedAccounts} account(s) on file, no ring participation detected.`,
    findings.homeDistrictRank
      ? `Geography: ${findings.homeDistrictRank.district} currently ranks #${findings.homeDistrictRank.rank} of ${findings.homeDistrictRank.totalDistricts} districts by case volume.`
      : '',
    'Suggested next steps: verify current whereabouts via station of last FIR; cross-examine shared-case associates; pull call-detail records for linked phone assets.',
  ].filter(Boolean);
  return lines.join('\n');
}

/**
 * Runs the fixed 8-step investigation playbook. Pure SQLite — memo
 * composition (the only LLM call) is the caller's job so this stays
 * synchronous and unit-testable.
 */
export function runInvestigation(db: Database, personName: string): InvestigationResult {
  const steps: AgentStep[] = [];
  const findings: InvestigationFindings = {
    priorCases: [],
    topAssociates: [],
    similarCases: [],
    financial: { ownedAccounts: 0, ringMember: false, highValueTransfers: 0 },
  };
  let target: { personId: number; name: string } | null = null;
  let candidates: PersonCandidate[] | undefined;

  runStep(steps, 'resolve', 'Resolve identity', 'entity resolution', () => {
    const matches = findPersonCandidates(db, personName);
    if (matches.length === 0) return { skip: `No person matching "${personName}" in the database.` };
    if (matches.length > 1) {
      candidates = matches;
      return { skip: `${matches.length} people match "${personName}" — need disambiguation.` };
    }
    target = { personId: matches[0].personId, name: matches[0].name };
    return { summary: `Resolved to ${matches[0].name} (${matches[0].district}).` };
  });
  if (!target) return { target: null, steps, findings, memo: null, candidates };
  const person = target as { personId: number; name: string };

  runStep(steps, 'priors', 'Pull prior case history', 'case records', () => {
    findings.priorCases = firsForPerson(db, person.personId);
    if (findings.priorCases.length === 0) return { skip: 'No prior cases as accused.' };
    const types = [...new Set(findings.priorCases.map((fir) => fir.crime_type))];
    return {
      summary: `${findings.priorCases.length} prior case(s): ${types.join(', ')}.`,
      evidence: findings.priorCases.slice(0, 6).map((fir) => fir.fir_number),
    };
  });

  runStep(steps, 'network', 'Expand criminal network (2 hops)', 'network.ts BFS', () => {
    const graph = buildNetwork(db, person.personId, 2);
    findings.networkSize = { nodes: graph.nodes.length, edges: graph.edges.length };
    findings.topAssociates = db
      .prepare(
        `SELECT p.id AS personId, p.name, COUNT(DISTINCT a.fir_id) AS sharedCases
         FROM fir_accused a
         JOIN fir_accused b ON b.fir_id = a.fir_id AND b.person_id != a.person_id
         JOIN persons p ON p.id = b.person_id
         WHERE a.person_id = ? GROUP BY b.person_id ORDER BY sharedCases DESC LIMIT 5`
      )
      .all(person.personId) as InvestigationFindings['topAssociates'];
    return {
      summary: `${graph.nodes.length} connected entities, ${graph.edges.length} links; ${findings.topAssociates.length} recurring co-accused.`,
    };
  });

  runStep(steps, 'risk', 'Compute risk score', 'riskScoring.ts', () => {
    findings.profile = getOffenderProfiles(db, 1).find(
      (profile) => profile.personId === person.personId
    );
    if (!findings.profile) return { skip: 'No risk profile (no cases as accused).' };
    return {
      summary: `Risk ${findings.profile.riskCategory} — ${findings.profile.riskScore}/100 (priors, network degree, recency, versatility).`,
    };
  });

  runStep(steps, 'similar', 'Retrieve similar-MO cases', 'caseIntel.ts', () => {
    const latest = findings.priorCases[0];
    if (!latest) return { skip: 'No prior case to match modus operandi against.' };
    const intel = buildCaseIntelligence(db, latest.id);
    if (!intel || intel.similarCases.length === 0) {
      return { skip: 'No similar cases for the latest MO.' };
    }
    findings.similarCases = intel.similarCases.map((similar) => ({
      fir_number: similar.fir_number,
      crime_type: similar.crime_type,
      district: similar.district,
    }));
    return {
      summary: `${findings.similarCases.length} case(s) share MO/type/location signals with ${latest.fir_number}.`,
      evidence: findings.similarCases.slice(0, 5).map((similar) => similar.fir_number),
    };
  });

  runStep(steps, 'financial', 'Check financial links', 'financial.ts', () => {
    const accounts = db
      .prepare(
        `SELECT id, identifier FROM assets WHERE owner_person_id = ? AND type = 'bank_account'`
      )
      .all(person.personId) as Array<{ id: number; identifier: string }>;
    findings.financial.ownedAccounts = accounts.length;
    if (accounts.length === 0) return { skip: 'No bank accounts on record.' };

    const trail = buildMoneyTrail(db);
    const accountIds = new Set(accounts.map((account) => account.id));
    findings.financial.ringMember = trail.rings.some((ring) =>
      ring.accounts.some((account) => accountIds.has(account.assetId))
    );
    const identifiers = new Set(accounts.map((account) => account.identifier));
    findings.financial.highValueTransfers = trail.highValueTransfers.filter(
      (transfer) => identifiers.has(transfer.from) || identifiers.has(transfer.to)
    ).length;
    return {
      summary: findings.financial.ringMember
        ? `Accounts participate in a circular-transfer ring; ${findings.financial.highValueTransfers} high-value transfer(s).`
        : `${accounts.length} account(s), no laundering-ring participation.`,
    };
  });

  runStep(steps, 'geo', 'Geographic context', 'hotspot ranking', () => {
    const district = findings.profile?.district ?? findings.priorCases[0]?.district;
    if (!district) return { skip: 'No home district on record.' };
    const ranks = db
      .prepare('SELECT district, COUNT(*) AS count FROM firs GROUP BY district ORDER BY count DESC')
      .all() as Array<{ district: string; count: number }>;
    const rank = ranks.findIndex((row) => row.district === district) + 1;
    if (rank === 0) return { skip: `No cases recorded in ${district}.` };
    findings.homeDistrictRank = { district, rank, totalDistricts: ranks.length };
    return { summary: `${district} ranks #${rank} of ${ranks.length} districts by case volume.` };
  });

  return { target: person, steps, findings, memo: null, candidates };
}
