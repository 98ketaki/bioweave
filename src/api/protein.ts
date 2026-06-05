// Stub: gene -> protein records via elink. Fill in later.

import { elink, esummary } from './ncbi';

export interface ProteinHit {
  uid: string;
  title: string;
  raw?: any;
}

export async function fetchProteinsForGene(geneUid: string, limit = 5): Promise<ProteinHit[]> {
  const ids = (await elink('gene', 'protein', [geneUid])).slice(0, limit);
  if (!ids.length) return [];
  const result = await esummary('protein', ids);
  return ids.map((uid) => ({
    uid,
    title: result[uid]?.title ?? '(protein)',
    raw: result[uid],
  }));
}
