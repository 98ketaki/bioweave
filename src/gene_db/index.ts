import type {
  GeneDBRequest,
  GeneDBResponse,
  GeneDBResult,
  GeneDBAmbiguity,
  GeneDBNotFound,
  GeneDBOptions,
  GeneQuery,
} from './types';
import { esearchGene, esummaryGene } from './ncbiClient';
import { normalizeGeneSummary } from './normalizeGeneRecord';
import { buildAmbiguityCandidates } from './disambiguation';

const DEFAULT_ORGANISM = { scientificName: 'Homo sapiens' };

function getGeneQueries(request: GeneDBRequest): GeneQuery[] {
  if (Array.isArray(request.geneQueries) && request.geneQueries.length > 0) {
    return request.geneQueries;
  }

  if (typeof request.rawQuery === 'string' && request.rawQuery.trim().length > 0) {
    return [{ query: request.rawQuery.trim() }];
  }

  throw new Error('Gene DB request must include a rawQuery or geneQueries');
}

function resolveOrganism(queryOrganism: GeneQuery['organism'], defaultOrganism: GeneDBRequest['defaultOrganism']) {
  return queryOrganism ?? defaultOrganism ?? DEFAULT_ORGANISM;
}

export async function resolveGenes(request: GeneDBRequest, options?: GeneDBOptions): Promise<GeneDBResponse> {
  const geneQueries = getGeneQueries(request);
  const defaultOrganism = request.defaultOrganism ?? DEFAULT_ORGANISM;
  const results: Array<GeneDBResult | GeneDBAmbiguity | GeneDBNotFound> = [];

  for (const query of geneQueries) {
    const organism = resolveOrganism(query.organism, defaultOrganism);
    const maxResults = options?.maxCandidates ?? 10;

    // Prefer a precise, symbol-scoped lookup. Only fall back to the broad
    // all-fields search (which yields an ambiguity list) when no symbol is
    // known or the symbol-scoped search comes back empty.
    let search = await esearchGene(query.query, organism, maxResults, query.symbol);
    if (search.ids.length === 0 && query.symbol) {
      search = await esearchGene(query.query, organism, maxResults);
    }

    if (search.ids.length === 0) {
      results.push({
        type: 'not_found',
        request: query,
        reason: `No gene found for "${query.query}" in ${organism.scientificName}`,
      });
      continue;
    }

    if (search.ids.length > 1) {
      const candidates = await buildAmbiguityCandidates(query, search.ids);
      results.push({
        type: 'ambiguity',
        request: query,
        candidates,
      });
      continue;
    }

    const geneUid = search.ids[0];

    if (options?.cache) {
      const cached = await options.cache.getByGeneUid(geneUid);
      if (cached) {
        results.push(cached);
        continue;
      }
    }

    const summary = await esummaryGene(geneUid);
    const geneRecord = normalizeGeneSummary(summary);

    const result: GeneDBResult = {
      type: 'result',
      request: query,
      geneRecord,
    };

    if (options?.cache) {
      await options.cache.setByGeneUid(geneUid, result);
    }

    results.push(result);
  }

  return { results };
}
