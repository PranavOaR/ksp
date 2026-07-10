import type {
  ActSectionInfo,
  FinancialSummaryData,
  FirRecord,
  NetworkSummaryData,
  OffenderProfile,
  PersonCandidate,
  QueryFilter,
} from '@/lib/intel/types';
import type { AgentStep } from '@/lib/intel/agent';
import type { Hotspot } from '@/lib/intel/hotspots';
import type { KnowledgePassage } from '@/lib/intel/knowledge';

export interface AgentPayload {
  target: { personId: number; name: string };
  steps: AgentStep[];
  memo: string | null;
}

export interface ChatResponse {
  answer: string;
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
    | 'agent'
    | 'knowledge';
  firs: FirRecord[];
  offenders: OffenderProfile[];
  totalCount: number;
  evidence: string[];
  reasoningTrail: string[];
  confidence: number;
  isRefinement: boolean;
  filter: QueryFilter;
  engine: 'claude' | 'rules';
  language: 'en' | 'kn';
  /** Intent-specific payloads (present only for the matching kind). */
  network?: NetworkSummaryData;
  financial?: FinancialSummaryData;
  actSection?: ActSectionInfo;
  hotspots?: Hotspot[];
  candidates?: PersonCandidate[];
  /** caseDetail: id for the deep link to /cases/[id]. */
  caseId?: number;
  /** investigate: the agent's step trace + drafted lead memo (Module A′). */
  agent?: AgentPayload;
  /** legalQuestion: retrieved knowledge-base passages with citations (A6). */
  knowledge?: KnowledgePassage[];
}

export interface ChatTurn {
  id: number;
  question: string;
  askedAt: string;
  response: ChatResponse | null;
  error: string | null;
}
