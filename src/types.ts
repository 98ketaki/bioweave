export type NodeKind = 'gene' | 'protein' | 'pubmed' | 'related-gene';

export interface GraphNode {
  id: string;            // unique: `${kind}:${uid}`
  kind: NodeKind;
  label: string;         // display name
  data?: unknown;
  expanded?: boolean;
}

export interface GraphEdge {
  source: string;        // node id
  target: string;        // node id
  kind: 'encodes' | 'mentions' | 'related';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
