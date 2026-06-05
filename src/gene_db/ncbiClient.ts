import type { OrganismInput } from './types';
import { esearch, esummary, elink } from '../api/ncbi';

const DEFAULT_SEARCH_MAX = 10;

function combineSearchTerm(query: string, organism?: OrganismInput, symbol?: string): string {
  // When a concrete gene symbol is known, scope the search to the gene-name
  // field. A bare `TP53` searches all fields and matches any record that merely
  // mentions p53 (EGFR, APOE, ...), drowning the real gene in thousands of hits.
  const sanitized = symbol?.trim() ? `${symbol.trim()}[Gene Name]` : query.trim();
  if (!organism?.scientificName) {
    return sanitized;
  }

  return `${sanitized} AND ${organism.scientificName}[Organism]`;
}

export type NCBISearchResponse = {
  ids: string[];
  count: number;
};

export type NCBISummaryRecord = {
  uid: string;
  name?: string;
  description?: string;
  chromosome?: string;
  organism?: {
    scientificname?: string;
    commonname?: string;
    taxid?: number | string;
  };
  nomenclaturesymbol?: string;
  nomenclaturename?: string;
  otheraliases?: string;
  otherdesignations?: string;
  summary?: string;
};

// Typed, gene-domain wrappers over the shared NCBI E-utilities client in
// ../api/ncbi. That module owns the HTTP plumbing, polite tagging, and the
// shared rate-limit queue; this layer adds gene-specific search scoping and
// the summary record shape the resolver expects.

export async function esearchGene(
  query: string,
  organism?: OrganismInput,
  maxResults = DEFAULT_SEARCH_MAX,
  symbol?: string,
): Promise<NCBISearchResponse> {
  const term = combineSearchTerm(query, organism, symbol);
  const ids = await esearch('gene', term, maxResults);
  return { ids, count: ids.length };
}

export async function esummaryGene(geneUid: string): Promise<NCBISummaryRecord> {
  const result = await esummary('gene', [geneUid]);
  const record = result[geneUid];
  if (!record) {
    throw new Error(`NCBI esummary returned no summary for gene UID ${geneUid}`);
  }

  return { uid: geneUid, ...record };
}

export async function esummaryGenes(geneUids: string[]): Promise<NCBISummaryRecord[]> {
  if (geneUids.length === 0) {
    return [];
  }

  const result = await esummary('gene', geneUids);
  return geneUids
    .map((uid) => (result[uid] ? { uid, ...result[uid] } : null))
    .filter(Boolean) as NCBISummaryRecord[];
}

export async function elinkGeneToDb(geneUid: string, targetDb: 'protein' | 'pubmed'): Promise<string[]> {
  return elink('gene', targetDb, [geneUid]);
}
