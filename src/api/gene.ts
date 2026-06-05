// KETAKI: fill this in.
//
// Goal: given a search term like "BRCA1" or "TP53", return a GeneHit
// with the Entrez Gene UID + a summary record we can show in the graph.
//
// Suggested steps (use helpers in ./ncbi.ts):
//   1. const ids = await esearch('gene', term, 1);
//   2. const summary = await esummary('gene', ids);  -> summary[uid]
//   3. Return { uid, name, description, aliases, chromosome, summary }.
//
// The App will then call expandGene(uid) to fan out to protein / pubmed.

import { esearch, esummary } from './ncbi';

export interface GeneHit {
  uid: string;
  name: string;
  description: string;
  aliases?: string[];
  chromosome?: string;
  summary?: string;
  raw?: any;
}

export async function searchGene(term: string): Promise<GeneHit | null> {
  // TODO(ketaki): implement using esearch + esummary.
  // Prefer human matches; fall back to any organism if none found.
  const humanTerm = /\[orgn\]|\[organism\]/i.test(term)
    ? term
    : `${term}[sym] AND human[orgn]`;
  let ids = await esearch('gene', humanTerm, 1);
  if (!ids.length) ids = await esearch('gene', term, 1);
  if (!ids.length) return null;
  const result = await esummary('gene', ids);
  const uid = ids[0];
  const r = result[uid] ?? {};
  return {
    uid,
    name: r.name ?? term,
    description: r.description ?? '',
    aliases: typeof r.otheraliases === 'string' ? r.otheraliases.split(', ') : [],
    chromosome: r.chromosome,
    summary: r.summary,
    raw: r,
  };
}
