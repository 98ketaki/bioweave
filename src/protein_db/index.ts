import { esummary } from '../api/ncbi';
import { elinkGeneToDb } from '../gene_db/ncbiClient';
import { normalizeProteinSummary } from './normalizeProteinRecord';
import type { NormalizedProteinRecord } from './types';

const DEFAULT_LIMIT = 5;

// Resolve a single protein UID to a normalized record (protein-DB analogue of
// esummaryGene + normalizeGeneSummary).
export async function resolveProtein(proteinUid: string): Promise<NormalizedProteinRecord> {
  const result = await esummary('protein', [proteinUid]);
  const record = result[proteinUid];
  if (!record) {
    throw new Error(`NCBI esummary returned no protein for UID ${proteinUid}`);
  }
  return normalizeProteinSummary({ uid: proteinUid, ...record });
}

// Resolve the proteins a gene encodes, normalized (mirrors the gene->protein link
// used by the graph, but returns normalized protein records instead of raw hits).
export async function resolveProteinsForGene(
  geneUid: string,
  limit = DEFAULT_LIMIT,
): Promise<NormalizedProteinRecord[]> {
  const uids = (await elinkGeneToDb(geneUid, 'protein')).slice(0, limit);
  if (uids.length === 0) return [];

  const result = await esummary('protein', uids);
  return uids
    .map((uid) => (result[uid] ? normalizeProteinSummary({ uid, ...result[uid] }) : null))
    .filter((r): r is NormalizedProteinRecord => r !== null);
}
