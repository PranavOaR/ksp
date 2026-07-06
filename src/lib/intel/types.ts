export type QueryIntent = 'listFirs' | 'listOffenders' | 'count' | 'trend';

export interface QueryFilter {
  intent: QueryIntent;
  crimeType?: string;
  district?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
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
