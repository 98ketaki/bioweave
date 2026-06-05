import type { GeneQuery, OrganismInput } from './types';

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_SEARCH_MAX = 10;

// NCBI E-utilities cap unauthenticated clients at 3 requests/sec (10/sec with an
// API key). The pipeline fires several calls back-to-back, so serialize them and
// keep a minimum gap between requests to avoid HTTP 429 responses.
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const MIN_REQUEST_GAP_MS = NCBI_API_KEY ? 110 : 350;
let requestChain: Promise<unknown> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttledFetch(url: string): Promise<Response> {
  const result = requestChain.then(() => fetch(url));
  // Advance the chain only after the spacing delay so the next call waits its turn.
  requestChain = result.then(
    () => delay(MIN_REQUEST_GAP_MS),
    () => delay(MIN_REQUEST_GAP_MS),
  );
  return result;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${EUTILS_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  if (NCBI_API_KEY) {
    url.searchParams.set('api_key', NCBI_API_KEY);
  }
  return url.toString();
}

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

function checkFetchStatus(response: Response, context: string) {
  if (!response.ok) {
    throw new Error(`NCBI ${context} request failed with status ${response.status}`);
  }
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

export async function esearchGene(
  query: string,
  organism?: OrganismInput,
  maxResults = DEFAULT_SEARCH_MAX,
  symbol?: string,
): Promise<NCBISearchResponse> {
  const term = combineSearchTerm(query, organism, symbol);
  const url = buildUrl('esearch.fcgi', {
    db: 'gene',
    term,
    retmode: 'json',
    retmax: String(maxResults),
  });

  const response = await throttledFetch(url);
  checkFetchStatus(response, 'esearch');
  const payload = (await response.json()) as any;
  const ids = Array.isArray(payload?.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
  const count = Number(payload?.esearchresult?.count ?? ids.length);

  return { ids, count };
}

export async function esummaryGene(geneUid: string): Promise<NCBISummaryRecord> {
  const url = buildUrl('esummary.fcgi', {
    db: 'gene',
    id: geneUid,
    retmode: 'json',
  });

  const response = await throttledFetch(url);
  checkFetchStatus(response, 'esummary');
  const payload = (await response.json()) as any;
  const record = payload?.result?.[geneUid];
  if (!record) {
    throw new Error(`NCBI esummary returned no summary for gene UID ${geneUid}`);
  }

  return { uid: geneUid, ...record };
}

export async function esummaryGenes(geneUids: string[]): Promise<NCBISummaryRecord[]> {
  if (geneUids.length === 0) {
    return [];
  }
  const url = buildUrl('esummary.fcgi', {
    db: 'gene',
    id: geneUids.join(','),
    retmode: 'json',
  });

  const response = await throttledFetch(url);
  checkFetchStatus(response, 'esummary');
  const payload = (await response.json()) as any;
  const results = geneUids
    .map((uid) => {
      const record = payload?.result?.[uid];
      return record ? { uid, ...record } : null;
    })
    .filter(Boolean);
  return results;
}

export async function elinkGeneToDb(geneUid: string, targetDb: 'protein' | 'pubmed'): Promise<string[]> {
  const url = buildUrl('elink.fcgi', {
    dbfrom: 'gene',
    db: targetDb,
    id: geneUid,
    retmode: 'json',
  });

  const response = await throttledFetch(url);
  checkFetchStatus(response, 'elink');
  const payload = (await response.json()) as any;
  const linksets = Array.isArray(payload?.linksets) ? payload.linksets : [];
  const linkset = linksets[0] || {};
  const linksetsDb = Array.isArray(linkset?.linksetdbs) ? linkset.linksetdbs : [];
  const firstLinkset = linksetsDb[0] || {};
  const ids = Array.isArray(firstLinkset?.links) ? firstLinkset.links : [];

  return ids.map(String);
}
