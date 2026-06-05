import { esummaryGene } from '../gene_db/ncbiClient';
import { normalizeGeneSummary } from '../gene_db/normalizeGeneRecord';
import { resolveProtein } from '../protein_db/index';
import type { DetailRequest, DetailResult } from './types';

// "Know more": return the full normalized gene-DB or protein-DB record for an entity.
export async function resolveDetail(req: DetailRequest): Promise<DetailResult> {
  if (req.type === 'gene') {
    const record = normalizeGeneSummary(await esummaryGene(req.uid));
    return { type: 'gene', record };
  }
  if (req.type === 'protein') {
    const record = await resolveProtein(req.uid);
    return { type: 'protein', record };
  }
  throw new Error(`Unknown detail type: ${String((req as DetailRequest).type)}`);
}
