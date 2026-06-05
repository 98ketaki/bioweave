// Gene search for the graph: resolve a free-text symbol (e.g. "BRCA1", "TP53")
// to a single best-match Entrez Gene record.
//
// Search scoping and summary normalization are shared with the Node
// gene-resolution pipeline via ../gene_db, so the graph app and the pipeline
// resolve genes identically (symbol-scoped search, consistent fields).

import { esearchGene, esummaryGene } from '../gene_db/ncbiClient';
import { normalizeGeneSummary } from '../gene_db/normalizeGeneRecord';
import { readSearchCache, writeSearchCache } from './searchCache';
import type { OrganismInput } from '../gene_db/types';

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

export async function searchGene(term: string, organism: OrganismInput = HUMAN): Promise<GeneHit | null> {
  const ref = term.trim();
  // Cache per term + organism so a human lookup can't shadow another organism's.
  const cacheKey = `${ref}|${organism.scientificName}`;

  const cached = readSearchCache<GeneHit | null>(cacheKey);
  if (cached !== null) return cached;

  // Symbol-/name-scoped lookup: requested organism first, then any organism. We
  // never fall back to an all-fields search — that ranks by gene "weight" and
  // returns well-studied genes that merely mention the term ("insulin" -> TP53).
  let search = await esearchGene(ref, organism, 1, ref);
  if (search.ids.length === 0) search = await esearchGene(ref, undefined, 1, ref);
  if (search.ids.length === 0) {
    writeSearchCache<GeneHit | null>(cacheKey, null);
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
  writeSearchCache(cacheKey, hit);
  return hit;
}
