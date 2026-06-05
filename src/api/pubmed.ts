// STEVE: PubMed module.
//
// Goal: given a gene UID, return up to N PubMed papers that mention it.
// Use elink (dbfrom=gene, db=pubmed) to get PMIDs, then esummary on pubmed
// to get title / authors / pubdate.

import { elink, esummary } from './ncbi';

export interface PubmedHit {
  pmid: string;
  title: string;
  authors?: string[];
  pubdate?: string;
  source?: string;
  raw?: any;
}

export async function fetchPubmedForGene(geneUid: string, limit = 5): Promise<PubmedHit[]> {
  const pmids = (await elink('gene', 'pubmed', [geneUid])).slice(0, limit);
  if (!pmids.length) return [];
  const result = await esummary('pubmed', pmids);
  return pmids.map((pmid) => {
    const r = result[pmid] ?? {};
    return {
      pmid,
      title: r.title ?? '(no title)',
      authors: (r.authors ?? []).map((a: any) => a.name),
      pubdate: r.pubdate,
      source: r.source,
      raw: r,
    };
  });
}
