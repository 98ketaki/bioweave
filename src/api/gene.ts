// Gene search for the graph: resolve a free-text symbol (e.g. "BRCA1", "TP53")
// to a single best-match Entrez Gene record.
//
// Search scoping and summary normalization are shared with the Node
// gene-resolution pipeline via ../gene_db, so the graph app and the pipeline
// resolve genes identically (symbol-scoped search, consistent fields).

import { esearchGene, esummaryGene } from '../gene_db/ncbiClient';
import { normalizeGeneSummary } from '../gene_db/normalizeGeneRecord';
import { readSearchCache, writeSearchCache } from './searchCache';

export interface GeneHit {
  uid: string;
  name: string;
  description: string;
  aliases?: string[];
  chromosome?: string;
  summary?: string;
  raw?: unknown;
}

const HUMAN = { scientificName: 'Homo sapiens', commonName: 'human' };

export async function searchGene(term: string): Promise<GeneHit | null> {
  const symbol = term.trim();

  const cached = readSearchCache<GeneHit | null>(symbol);
  if (cached !== null) return cached;

  // Mirror the pipeline's resolution order: a precise human symbol-scoped match
  // first, then a broad human search, then any organism.
  let search = await esearchGene(symbol, HUMAN, 1, symbol);
  if (search.ids.length === 0) search = await esearchGene(symbol, HUMAN, 1);
  if (search.ids.length === 0) search = await esearchGene(symbol, undefined, 1);
  if (search.ids.length === 0) {
    writeSearchCache<GeneHit | null>(symbol, null);
    return null;
  }

  const record = normalizeGeneSummary(await esummaryGene(search.ids[0]));
  const hit: GeneHit = {
    uid: record.geneUid,
    name: record.officialSymbol || term,
    description: record.description ?? record.fullName ?? '',
    aliases: record.aliases,
    chromosome: record.chromosomeLocation ?? undefined,
    summary: record.refSeqSummary ?? undefined,
    raw: record,
  };
  writeSearchCache(symbol, hit);
  return hit;
}
