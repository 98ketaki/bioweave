// Gene -> PubMed papers: follow the gene->pubmed elink, then summarize each
// paper's title, authors, and publication date.

import { esummary } from './ncbi';
import { elinkGeneToDb } from '../gene_db/ncbiClient';

export interface PubmedHit {
  pmid: string;
  title: string;
  authors?: string[];
  pubdate?: string;
  source?: string;
  raw?: unknown;
}

export async function fetchPubmedForGene(geneUid: string, limit = 5): Promise<PubmedHit[]> {
  const pmids = (await elinkGeneToDb(geneUid, 'pubmed')).slice(0, limit);
  if (!pmids.length) return [];
  const result = await esummary('pubmed', pmids);
  return pmids.map((pmid) => {
    const r = result[pmid] ?? {};
    return {
      pmid,
      title: r.title ?? '(no title)',
      authors: (r.authors ?? []).map((a: { name: string }) => a.name),
      pubdate: r.pubdate,
      source: r.source,
      raw: r,
    };
  });
}
