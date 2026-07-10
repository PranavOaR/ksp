export type QueryIntent =
  | 'listFirs'
  | 'listOffenders'
  | 'count'
  | 'trend'
  | 'personProfile'
  | 'caseDetail'
  | 'networkQuery'
  | 'financialSummary'
  | 'actSection'
  | 'hotspotQuery'
  | 'investigate'
  | 'legalQuestion';

export interface QueryFilter {
  intent: QueryIntent;
  crimeType?: string;
  district?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  /** Person the question is about ("who is Ravi Kumar", "investigate …"). */
  personName?: string;
  /** A specific case — legacy FIR/2026/BEN/0001 or 18-digit official CrimeNo. */
  firNumber?: string;
  /** Legal classification ("cases under BNS 303"). */
  actCode?: string;
  sectionCode?: string;
  /** Free-text modus operandi search ("lock-picking cases"). */
  moKeyword?: string;
  /** legalQuestion: the question text for knowledge-base retrieval (A6). */
  kbQuery?: string;
}

export interface ParsedQuery {
  filter: QueryFilter;
  /** Human-readable trail of what was understood, for Explainable AI (Module I). */
  matched: string[];
  /** True when the query refined the previous question instead of starting fresh. */
  isRefinement: boolean;
  /** 0..1 — how confidently the query was understood. */
  confidence: number;
}

export interface FirRecord {
  id: number;
  fir_number: string;
  crime_type: string;
  district: string;
  station_name: string;
  description: string;
  modus_operandi: string;
  occurred_at: string;
  status: string;
}

export interface OffenderProfile {
  personId: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  district: string;
  caseCount: number;
  crimeTypes: string[];
  networkDegree: number;
  lastActive: string;
  riskScore: number;
  riskCategory: 'Low' | 'Medium' | 'High';
}

export interface GraphNode {
  id: string;
  label: string;
  kind: 'person' | 'fir' | 'vehicle' | 'phone' | 'bank_account' | 'station';
  hop: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** A possible identity match when a name in a question is ambiguous. */
export interface PersonCandidate {
  personId: number;
  name: string;
  district: string;
  caseCount: number;
}

/** Copilot-sized digest of a network expansion (full graph lives at /network). */
export interface NetworkSummaryData {
  personId: number;
  personName: string;
  hops: number;
  nodeCount: number;
  edgeCount: number;
  topAssociates: Array<{ personId: number; name: string; sharedCases: number }>;
}

/** Copilot-sized digest of the money-trail analysis (full view at /financial). */
export interface FinancialSummaryData {
  ringCount: number;
  flaggedVolume: number;
  accountCount: number;
  transferCount: number;
  topTransfers: Array<{ from: string; fromOwner: string; to: string; toOwner: string; amount: number }>;
}

export interface ActSectionInfo {
  actCode: string;
  actName: string;
  sectionCode: string;
  sectionDescription: string;
}
