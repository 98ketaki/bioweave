import type { GeneQuery, GeneCandidate } from './types';
import { esummaryGenes } from './ncbiClient';
import { normalizeGeneSummary } from './normalizeGeneRecord';

export async function buildAmbiguityCandidates(query: GeneQuery, geneUids: string[]): Promise<GeneCandidate[]> {
  const summaries = await esummaryGenes(geneUids.slice(0, 5));

  return summaries.map((summary) => {
    const normalized = normalizeGeneSummary(summary);

    return {
      geneUid: normalized.geneUid,
      officialSymbol: normalized.officialSymbol || null,
      fullName: normalized.fullName,
      organism: normalized.organism,
      chromosomeLocation: normalized.chromosomeLocation,
      summarySnippet: normalized.description,
    };
  });
}
