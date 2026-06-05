// Gene -> protein records: follow the gene->protein elink, then summarize.

import { esummary } from './ncbi';
import { elinkGeneToDb } from '../gene_db/ncbiClient';

export interface ProteinHit {
  uid: string;
  title: string;
  raw?: unknown;
}

export async function fetchProteinsForGene(geneUid: string, limit = 5): Promise<ProteinHit[]> {
  const ids = (await elinkGeneToDb(geneUid, 'protein')).slice(0, limit);
  if (!ids.length) return [];
  const result = await esummary('protein', ids);
  return ids.map((uid) => ({
    uid,
    title: result[uid]?.title ?? '(protein)',
    raw: result[uid],
  }));
}
