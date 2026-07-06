import type { FirRecord, OffenderProfile, QueryFilter } from '@/lib/intel/types';

export interface ChatResponse {
  answer: string;
  kind: 'firs' | 'offenders' | 'count';
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
}

export interface ChatTurn {
  id: number;
  question: string;
  askedAt: string;
  response: ChatResponse | null;
  error: string | null;
}
