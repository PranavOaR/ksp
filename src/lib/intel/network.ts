import type { Database } from 'better-sqlite3';
import type { GraphEdge, GraphNode, NetworkGraph } from './types';

const MAX_NODES = 120;

interface Neighbor {
  node: GraphNode;
  relation: string;
}

function personNode(row: { id: number; name: string }, hop: number): GraphNode {
  return { id: `p:${row.id}`, label: row.name, kind: 'person', hop };
}

function firNode(row: { id: number; fir_number: string }, hop: number): GraphNode {
  return { id: `f:${row.id}`, label: row.fir_number, kind: 'fir', hop };
}

function assetNode(row: { id: number; type: string; identifier: string }, hop: number): GraphNode {
  return {
    id: `a:${row.id}`,
    label: row.identifier,
    kind: row.type as GraphNode['kind'],
    hop,
  };
}

function neighborsOfPerson(db: Database, personId: number, hop: number): Neighbor[] {
  const firs = db
    .prepare(
      `SELECT f.id, f.fir_number FROM firs f
       JOIN fir_accused fa ON fa.fir_id = f.id WHERE fa.person_id = ?`
    )
    .all(personId) as Array<{ id: number; fir_number: string }>;
  const assets = db
    .prepare('SELECT id, type, identifier FROM assets WHERE owner_person_id = ?')
    .all(personId) as Array<{ id: number; type: string; identifier: string }>;
  return [
    ...firs.map((fir) => ({ node: firNode(fir, hop), relation: 'accused in' })),
    ...assets.map((asset) => ({ node: assetNode(asset, hop), relation: 'owns' })),
  ];
}

function neighborsOfFir(db: Database, firId: number, hop: number): Neighbor[] {
  const accused = db
    .prepare(
      `SELECT p.id, p.name FROM persons p
       JOIN fir_accused fa ON fa.person_id = p.id WHERE fa.fir_id = ?`
    )
    .all(firId) as Array<{ id: number; name: string }>;
  const victims = db
    .prepare(
      `SELECT p.id, p.name FROM persons p
       JOIN fir_victims fv ON fv.person_id = p.id WHERE fv.fir_id = ?`
    )
    .all(firId) as Array<{ id: number; name: string }>;
  const assets = db
    .prepare(
      `SELECT a.id, a.type, a.identifier FROM assets a
       JOIN fir_assets fa ON fa.asset_id = a.id WHERE fa.fir_id = ?`
    )
    .all(firId) as Array<{ id: number; type: string; identifier: string }>;
  return [
    ...accused.map((person) => ({ node: personNode(person, hop), relation: 'accused' })),
    ...victims.map((person) => ({ node: personNode(person, hop), relation: 'victim' })),
    ...assets.map((asset) => ({ node: assetNode(asset, hop), relation: 'evidence' })),
  ];
}

function neighborsOf(db: Database, node: GraphNode, hop: number): Neighbor[] {
  const numericId = Number(node.id.slice(2));
  if (node.kind === 'person') return neighborsOfPerson(db, numericId, hop);
  if (node.kind === 'fir') return neighborsOfFir(db, numericId, hop);
  return [];
}

/**
 * Entity relationship explorer (PRD B1, B3): breadth-first expansion from a
 * person across FIRs, co-accused, victims, and linked assets up to `hops`.
 */
export function buildNetwork(db: Database, personId: number, hops = 2): NetworkGraph {
  const start = db
    .prepare('SELECT id, name FROM persons WHERE id = ?')
    .get(personId) as { id: number; name: string } | undefined;
  if (!start) return { nodes: [], edges: [] };

  const rootNode = personNode(start, 0);
  const nodes = new Map<string, GraphNode>([[rootNode.id, rootNode]]);
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();
  let frontier: GraphNode[] = [rootNode];

  for (let hop = 1; hop <= hops && nodes.size < MAX_NODES; hop += 1) {
    const nextFrontier: GraphNode[] = [];
    for (const current of frontier) {
      for (const { node, relation } of neighborsOf(db, current, hop)) {
        const edgeKey = [current.id, node.id].sort().join('|');
        if (!edgeKeys.has(edgeKey) && current.id !== node.id) {
          edgeKeys.add(edgeKey);
          edges.push({ source: current.id, target: node.id, relation });
        }
        if (!nodes.has(node.id) && nodes.size < MAX_NODES) {
          nodes.set(node.id, node);
          nextFrontier.push(node);
        }
      }
    }
    frontier = nextFrontier;
  }

  return { nodes: [...nodes.values()], edges };
}
