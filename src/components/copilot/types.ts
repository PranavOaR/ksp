import type {
  ActSectionInfo,
  FinancialSummaryData,
  FirRecord,
  NetworkSummaryData,
  OffenderProfile,
  PersonCandidate,
  QueryFilter,
} from '@/lib/intel/types';
import type { Hotspot } from '@/lib/intel/hotspots';

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
    | 'noMatch';
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
}

export interface ChatTurn {
  id: number;
  question: string;
  askedAt: string;
  response: ChatResponse | null;
  error: string | null;
}
