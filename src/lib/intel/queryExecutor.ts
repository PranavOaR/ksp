import type { Database } from 'better-sqlite3';
import { buildCaseIntelligence, type CaseIntelligence } from './caseIntel';
import { buildMoneyTrail } from './financial';
import { detectHotspots, type Hotspot, type RegionCount } from './hotspots';
import { buildNetwork } from './network';
import { getOffenderProfiles } from './offenders';
import { composeExtractiveAnswer, retrieveLegal, type KnowledgePassage } from './knowledge';
import { hasKnowledgeBase, hasV2Schema } from '../db/seedV2';
import type {
  ActSectionInfo,
  FinancialSummaryData,
  FirRecord,
  NetworkSummaryData,
  OffenderProfile,
  PersonCandidate,
  QueryFilter,
} from './types';

const FIR_RESULT_LIMIT = 25;
const CANDIDATE_LIMIT = 6;
const ASSOCIATE_LIMIT = 5;

export interface QueryResult {
  kind:
    | 'firs'
    | 'offenders'
    | 'count'
    | 'profile'
    | 'caseDetail'
    | 'network'
    | 'financial'
    | 'actSection'
    | 'hotspots'
    | 'candidates'
    | 'noMatch'
    | 'knowledge';
  firs: FirRecord[];
  offenders: OffenderProfile[];
  totalCount: number;
  /** FIR numbers backing the answer — evidence references (PRD I1). */
  evidence: string[];
  summary: string;
  /** Intent-specific payloads (present only for the matching kind). */
  profile?: OffenderProfile;
  caseIntel?: CaseIntelligence;
  network?: NetworkSummaryData;
  financial?: FinancialSummaryData;
  actSection?: ActSectionInfo;
  hotspots?: Hotspot[];
  candidates?: PersonCandidate[];
  knowledge?: KnowledgePassage[];
}

function emptyResult(kind: QueryResult['kind'], summary: string): QueryResult {
  return { kind, firs: [], offenders: [], totalCount: 0, evidence: [], summary };
}

function buildWhere(filter: QueryFilter): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.crimeType) {
    conditions.push('f.crime_type = ?');
    params.push(filter.crimeType);
  }
  if (filter.district) {
    conditions.push('f.district = ?');
    params.push(filter.district);
  }
  if (filter.status) {
    conditions.push('f.status = ?');
    params.push(filter.status);
  }
  if (filter.fromDate) {
    conditions.push('f.occurred_at >= ?');
    params.push(filter.fromDate);
  }
  if (filter.toDate) {
    conditions.push('f.occurred_at <= ?');
    params.push(`${filter.toDate}T23:59:59`);
  }
  if (filter.moKeyword) {
    conditions.push('f.modus_operandi LIKE ?');
    params.push(`%${escapeLike(filter.moKeyword)}%`);
  }
  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function describeFilter(filter: QueryFilter, totalCount: number): string {
  const parts = [
    filter.crimeType ?? 'crime',
    'cases',
    filter.district ? `in ${filter.district}` : 'across Karnataka',
    filter.status ? `with status "${filter.status}"` : '',
    filter.fromDate ? `between ${filter.fromDate} and ${filter.toDate ?? 'now'}` : '',
    filter.moKeyword ? `with MO matching "${filter.moKeyword}"` : '',
  ].filter(Boolean);
  return `Found ${totalCount} ${parts.join(' ')}.`;
}

/** % and _ are wildcards in LIKE — escape them so names stay literal. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function findPersonCandidates(db: Database, name: string): PersonCandidate[] {
  return db
    .prepare(
      `SELECT p.id AS personId, p.name, p.district,
              COUNT(DISTINCT fa.fir_id) AS caseCount
       FROM persons p LEFT JOIN fir_accused fa ON fa.person_id = p.id
       WHERE p.name LIKE ? ESCAPE '\\'
       GROUP BY p.id ORDER BY caseCount DESC, p.name
       LIMIT ${CANDIDATE_LIMIT}`
    )
    .all(`%${escapeLike(name)}%`) as PersonCandidate[];
}

function firsForPerson(db: Database, personId: number): FirRecord[] {
  return db
    .prepare(
      `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
              f.description, f.modus_operandi, f.occurred_at, f.status
       FROM firs f
       JOIN fir_accused fa ON fa.fir_id = f.id AND fa.person_id = ?
       JOIN stations s ON s.id = f.station_id
       ORDER BY f.occurred_at DESC LIMIT ${FIR_RESULT_LIMIT}`
    )
    .all(personId) as FirRecord[];
}

/**
 * Resolves a name to exactly one person, or reports the ambiguity/miss as a
 * user-facing result. Callers proceed only on the { personId } shape.
 */
function resolvePerson(
  db: Database,
  name: string
): { personId: number; personName: string } | QueryResult {
  const candidates = findPersonCandidates(db, name);
  if (candidates.length === 0) {
    return emptyResult(
      'noMatch',
      `No person matching "${name}" found in the database. Check the spelling or try a fuller name.`
    );
  }
  if (candidates.length > 1) {
    return {
      ...emptyResult(
        'candidates',
        `${candidates.length} people match "${name}" — which one did you mean? ` +
          candidates.map((c) => `${c.name} (${c.district}, ${c.caseCount} cases)`).join('; ')
      ),
      candidates,
      totalCount: candidates.length,
    };
  }
  return { personId: candidates[0].personId, personName: candidates[0].name };
}

function executePersonProfile(db: Database, filter: QueryFilter): QueryResult {
  const resolved = resolvePerson(db, filter.personName ?? '');
  if ('kind' in resolved) return resolved;

  const profile = getOffenderProfiles(db, 1).find(
    (candidate) => candidate.personId === resolved.personId
  );
  const firs = firsForPerson(db, resolved.personId);
  if (!profile) {
    return {
      ...emptyResult(
        'profile',
        `${resolved.personName} is in the database but has no recorded cases as accused.`
      ),
      firs,
    };
  }
  return {
    kind: 'profile',
    firs,
    offenders: [profile],
    totalCount: profile.caseCount,
    evidence: firs.map((fir) => fir.fir_number),
    summary:
      `${profile.name} (${profile.age}, ${profile.district}): ${profile.caseCount} case(s) — ` +
      `${profile.crimeTypes.join(', ')}. Risk ${profile.riskCategory} (${profile.riskScore}/100), ` +
      `network degree ${profile.networkDegree}, last active ${profile.lastActive.slice(0, 10)}.`,
    profile,
  };
}

function executeCaseDetail(db: Database, filter: QueryFilter): QueryResult {
  const firNumber = filter.firNumber ?? '';
  const row = db
    .prepare('SELECT id FROM firs WHERE fir_number = ? OR crime_no = ? LIMIT 1')
    .get(firNumber, firNumber) as { id: number } | undefined;
  if (!row) {
    return emptyResult('noMatch', `No case with number ${firNumber} found in this workspace.`);
  }
  const caseIntel = buildCaseIntelligence(db, row.id);
  if (!caseIntel) {
    return emptyResult('noMatch', `Case ${firNumber} could not be loaded.`);
  }
  return {
    kind: 'caseDetail',
    firs: [],
    offenders: [],
    totalCount: 1,
    evidence: [caseIntel.fir.fir_number, ...caseIntel.similarCases.map((c) => c.fir_number)].slice(0, 10),
    summary:
      `${caseIntel.fir.fir_number}: ${caseIntel.fir.crime_type} in ${caseIntel.fir.district} ` +
      `(${caseIntel.fir.occurred_at.slice(0, 10)}, ${caseIntel.fir.status}). ` +
      `${caseIntel.accused.length} accused, ${caseIntel.victims.length} victim(s), ` +
      `${caseIntel.similarCases.length} similar case(s) on record.`,
    caseIntel,
  };
}

function executeNetworkQuery(db: Database, filter: QueryFilter): QueryResult {
  const resolved = resolvePerson(db, filter.personName ?? '');
  if ('kind' in resolved) return resolved;

  const graph = buildNetwork(db, resolved.personId, 2);
  const topAssociates = db
    .prepare(
      `SELECT p.id AS personId, p.name, COUNT(DISTINCT a.fir_id) AS sharedCases
       FROM fir_accused a
       JOIN fir_accused b ON b.fir_id = a.fir_id AND b.person_id != a.person_id
       JOIN persons p ON p.id = b.person_id
       WHERE a.person_id = ?
       GROUP BY b.person_id ORDER BY sharedCases DESC
       LIMIT ${ASSOCIATE_LIMIT}`
    )
    .all(resolved.personId) as NetworkSummaryData['topAssociates'];

  const network: NetworkSummaryData = {
    personId: resolved.personId,
    personName: resolved.personName,
    hops: 2,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    topAssociates,
  };
  const associateNote =
    topAssociates.length > 0
      ? ` Top associates: ${topAssociates
          .map((associate) => `${associate.name} (${associate.sharedCases} shared cases)`)
          .join(', ')}.`
      : ' No co-accused links on record.';
  return {
    kind: 'network',
    firs: [],
    offenders: [],
    totalCount: graph.nodes.length,
    evidence: firsForPerson(db, resolved.personId).map((fir) => fir.fir_number).slice(0, 10),
    summary:
      `${resolved.personName}'s 2-hop network: ${graph.nodes.length} entities, ` +
      `${graph.edges.length} links.${associateNote}`,
    network,
  };
}

function executeFinancialSummary(db: Database): QueryResult {
  const trail = buildMoneyTrail(db);
  const financial: FinancialSummaryData = {
    ringCount: trail.rings.length,
    flaggedVolume: trail.stats.flaggedVolume,
    accountCount: trail.stats.accountCount,
    transferCount: trail.stats.transferCount,
    topTransfers: trail.highValueTransfers.slice(0, 5).map((transfer) => ({
      from: transfer.from,
      fromOwner: transfer.fromOwner,
      to: transfer.to,
      toOwner: transfer.toOwner,
      amount: transfer.amount,
    })),
  };
  const volumeInr = `₹${Math.round(trail.stats.flaggedVolume).toLocaleString('en-IN')}`;
  return {
    kind: 'financial',
    firs: [],
    offenders: [],
    totalCount: trail.rings.length,
    evidence: trail.rings
      .slice(0, 5)
      .map((ring) => `Ring: ${ring.accounts.map((account) => account.ownerName).join(' → ')}`),
    summary:
      `${trail.rings.length} circular-transfer ring(s) detected across ` +
      `${trail.stats.accountCount} accounts and ${trail.stats.transferCount} transactions; ` +
      `flagged volume ${volumeInr}. Full graph on the Financial Intel page.`,
    financial,
  };
}

function executeActSection(db: Database, filter: QueryFilter): QueryResult {
  if (!hasV2Schema(db)) {
    return emptyResult('noMatch', 'Legal-section data is not available in this workspace yet.');
  }
  const actCode = filter.actCode ?? 'BNS';
  const sectionCode = filter.sectionCode ?? '';
  const sectionRow = db
    .prepare(
      `SELECT s.section_description, a.short_name FROM sections s
       JOIN acts a ON a.act_code = s.act_code
       WHERE s.act_code = ? AND s.section_code = ?`
    )
    .get(actCode, sectionCode) as { section_description: string; short_name: string } | undefined;

  const districtClause = filter.district ? 'AND f.district = ?' : '';
  const params: unknown[] = [actCode, sectionCode];
  if (filter.district) params.push(filter.district);
  const firs = db
    .prepare(
      `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
              f.description, f.modus_operandi, f.occurred_at, f.status
       FROM firs f
       JOIN act_section_association asa ON asa.case_master_id = f.id
         AND asa.act_code = ? AND asa.section_code = ?
       JOIN stations s ON s.id = f.station_id
       WHERE 1=1 ${districtClause}
       ORDER BY f.occurred_at DESC LIMIT ${FIR_RESULT_LIMIT}`
    )
    .all(...params) as FirRecord[];
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total FROM firs f
       JOIN act_section_association asa ON asa.case_master_id = f.id
         AND asa.act_code = ? AND asa.section_code = ?
       WHERE 1=1 ${districtClause}`
    )
    .get(...params) as { total: number };

  const actName = sectionRow?.short_name ?? actCode;
  return {
    kind: 'actSection',
    firs,
    offenders: [],
    totalCount: countRow.total,
    evidence: firs.map((fir) => fir.fir_number),
    summary:
      `${countRow.total} case(s) charged under ${actName} §${sectionCode}` +
      `${filter.district ? ` in ${filter.district}` : ''}.` +
      (sectionRow ? ` ${sectionRow.section_description.split('—')[0].trim()}.` : ''),
    ...(sectionRow
      ? {
          actSection: {
            actCode,
            actName,
            sectionCode,
            sectionDescription: sectionRow.section_description,
          },
        }
      : {}),
  };
}

/** Mirrors the analytics route's live-data-relative quarter windows (A1). */
function executeHotspotQuery(db: Database, filter: QueryFilter): QueryResult {
  const { maxDate } = db
    .prepare(`SELECT COALESCE(MAX(occurred_at), datetime('now')) AS maxDate FROM firs`)
    .get() as { maxDate: string };
  const max = new Date(maxDate);
  const recent = new Date(max);
  recent.setMonth(recent.getMonth() - 3);
  const previous = new Date(max);
  previous.setMonth(previous.getMonth() - 6);
  const recentStart = recent.toISOString().slice(0, 10);
  const previousStart = previous.toISOString().slice(0, 10);

  const crimeClause = filter.crimeType ? 'WHERE crime_type = ?' : '';
  const params: unknown[] = [recentStart, previousStart, recentStart];
  if (filter.crimeType) params.push(filter.crimeType);
  const regionCounts = db
    .prepare(
      `SELECT district AS region,
              COUNT(*) AS total,
              SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS recent,
              SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous
       FROM firs ${crimeClause} GROUP BY district`
    )
    .all(...params) as RegionCount[];
  const hotspots = detectHotspots(regionCounts);
  const top = hotspots.slice(0, 3);
  const emerging = hotspots.filter((hotspot) => hotspot.isEmerging);

  return {
    kind: 'hotspots',
    firs: [],
    offenders: [],
    totalCount: hotspots.length,
    evidence: top.map((hotspot) => `${hotspot.region}: ${hotspot.total} cases`),
    summary:
      `Top ${filter.crimeType ? `${filter.crimeType} ` : ''}hotspots: ` +
      top.map((h) => `${h.region} (${h.total})`).join(', ') +
      (emerging.length > 0
        ? `. Emerging: ${emerging.map((h) => `${h.region} +${h.growthPercent}%`).join(', ')}.`
        : '.'),
    hotspots,
  };
}

/**
 * Knowledge-base answer mode (Module A6): retrieval over legal texts +
 * SOPs. The deterministic answer is extractive; the chat route upgrades it
 * to a Claude-grounded composition when the LLM path is live.
 */
function executeLegalQuestion(db: Database, filter: QueryFilter): QueryResult {
  if (!hasKnowledgeBase(db)) {
    return emptyResult('noMatch', 'The legal knowledge base is not available in this workspace.');
  }
  const passages = retrieveLegal(db, filter.kbQuery ?? '');
  return {
    kind: 'knowledge',
    firs: [],
    offenders: [],
    totalCount: passages.length,
    evidence: passages.map((passage) => passage.title),
    summary: composeExtractiveAnswer(passages),
    knowledge: passages,
  };
}

/** Executes a structured filter against the FIR database (PRD A1). */
export function executeQuery(db: Database, filter: QueryFilter): QueryResult {
  switch (filter.intent) {
    // The investigate intent is normally intercepted by the agent in the
    // chat route; executing it directly degrades to a profile lookup.
    case 'investigate':
    case 'personProfile':
      return executePersonProfile(db, filter);
    case 'caseDetail':
      return executeCaseDetail(db, filter);
    case 'networkQuery':
      return executeNetworkQuery(db, filter);
    case 'financialSummary':
      return executeFinancialSummary(db);
    case 'actSection':
      return executeActSection(db, filter);
    case 'hotspotQuery':
      return executeHotspotQuery(db, filter);
    case 'legalQuestion':
      return executeLegalQuestion(db, filter);
    default:
      break;
  }

  if (filter.intent === 'listOffenders') {
    const all = getOffenderProfiles(db);
    const offenders = all
      .filter((offender) =>
        filter.crimeType ? offender.crimeTypes.includes(filter.crimeType) : true
      )
      .filter((offender) => (filter.district ? offender.district === filter.district : true))
      .slice(0, 20);
    return {
      kind: 'offenders',
      firs: [],
      offenders,
      totalCount: offenders.length,
      evidence: offenders.map((offender) => `${offender.caseCount} FIRs vs ${offender.name}`),
      summary: `Identified ${offenders.length} repeat offenders${
        filter.crimeType ? ` involved in ${filter.crimeType}` : ''
      }${filter.district ? ` operating in ${filter.district}` : ''}, ranked by case count.`,
    };
  }

  const { clause, params } = buildWhere(filter);
  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM firs f ${clause}`)
    .get(...params) as { total: number };

  const firs =
    filter.intent === 'count'
      ? []
      : (db
          .prepare(
            `SELECT f.id, f.fir_number, f.crime_type, f.district, s.name AS station_name,
                    f.description, f.modus_operandi, f.occurred_at, f.status
             FROM firs f JOIN stations s ON s.id = f.station_id
             ${clause} ORDER BY f.occurred_at DESC LIMIT ${FIR_RESULT_LIMIT}`
          )
          .all(...params) as FirRecord[]);

  return {
    kind: filter.intent === 'count' ? 'count' : 'firs',
    firs,
    offenders: [],
    totalCount: countRow.total,
    evidence: firs.map((fir) => fir.fir_number),
    summary: describeFilter(filter, countRow.total),
  };
}
