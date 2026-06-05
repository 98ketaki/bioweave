import { resolveGenes } from '../gene_db/index';
import { elinkGeneToDb } from '../gene_db/ncbiClient';
import { esearch, efetch } from '../api/ncbi';
import { resolveProteinsForGene } from '../protein_db/index';
import { geneUrl, proteinUrl, pubmedUrl } from './citations';
import type { Evidence, PaperEvidence, ProteinEvidence, Understanding } from './types';

const PUBMED_LIMIT = 5;
const PROTEIN_LIMIT = 5;

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // strip inline tags like <i>, <sub>
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(block: string, re: RegExp): string | null {
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

// Parse a PubMed efetch XML payload (retmode=xml, rettype=abstract) into per-PMID
// records. Regex/string based — sufficient for abstract extraction, not a general
// XML parser.
export function parsePubmedXml(xml: string): Map<string, Omit<PaperEvidence, 'url'>> {
  const out = new Map<string, Omit<PaperEvidence, 'url'>>();
  const blocks = xml.split(/<PubmedArticle[ >]/).slice(1);

  for (const block of blocks) {
    const pmid = firstMatch(block, /<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmid) continue;

    const title = firstMatch(block, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) ?? '(no title)';
    const year = firstMatch(block, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);

    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) =>
      decodeEntities(m[1]),
    );
    const abstract = abstractParts.length ? abstractParts.join(' ') : null;

    const authors = [...block.matchAll(/<Author[^>]*>[\s\S]*?<\/Author>/g)]
      .map((m) => {
        const last = firstMatch(m[0], /<LastName>([\s\S]*?)<\/LastName>/);
        const fore = firstMatch(m[0], /<ForeName>([\s\S]*?)<\/ForeName>/);
        return [fore, last].filter(Boolean).join(' ');
      })
      .filter(Boolean);

    out.set(pmid, { pmid, title, abstract, authors, year });
  }

  return out;
}

async function fetchPapers(symbol: string, geneUid: string, pubmedQuery?: string): Promise<PaperEvidence[]> {
  // Relevance-first: a focused symbol+topic search. Fall back to gene->pubmed links.
  let pmids: string[] = [];
  if (pubmedQuery) {
    const term = `${symbol}[Gene Name] AND (${pubmedQuery})`;
    pmids = (await esearch('pubmed', term, PUBMED_LIMIT)).slice(0, PUBMED_LIMIT);
  }
  if (pmids.length === 0) {
    pmids = (await elinkGeneToDb(geneUid, 'pubmed')).slice(0, PUBMED_LIMIT);
  }
  if (pmids.length === 0) return [];

  const xml = await efetch('pubmed', pmids);
  const parsed = parsePubmedXml(xml);

  // Preserve the search/link ranking order.
  return pmids
    .map((pmid) => {
      const rec = parsed.get(pmid);
      if (!rec) return null;
      return { ...rec, url: pubmedUrl(pmid) } satisfies PaperEvidence;
    })
    .filter((p): p is PaperEvidence => p !== null);
}

export async function gatherEvidence(u: Understanding): Promise<Evidence> {
  const empty: Evidence = { gene: null, proteins: [], papers: [], geneResolution: 'no_gene' };

  if (u.geneQueries.length === 0) return empty;

  const response = await resolveGenes({
    geneQueries: u.geneQueries,
    defaultOrganism: u.geneQueries[0].organism,
  });
  const first = response.results[0];

  if (!first || first.type === 'not_found') {
    return {
      ...empty,
      geneResolution: 'not_found',
      notFoundReason: first?.type === 'not_found' ? first.reason : 'No gene found.',
    };
  }

  if (first.type === 'ambiguity') {
    return { ...empty, geneResolution: 'ambiguity', ambiguityCandidates: first.candidates };
  }

  // first.type === 'result'
  const record = first.geneRecord;
  const gene = { geneRecord: record, url: geneUrl(record.geneUid) };

  let proteins: ProteinEvidence[] = [];
  if (u.sources.includes('protein')) {
    const records = await resolveProteinsForGene(record.geneUid, PROTEIN_LIMIT);
    proteins = records.map((r) => ({ proteinRecord: r, url: proteinUrl(r.proteinUid) }));
  }

  let papers: PaperEvidence[] = [];
  if (u.sources.includes('pubmed')) {
    papers = await fetchPapers(record.officialSymbol, record.geneUid, u.pubmedQuery);
  }

  return { gene, proteins, papers, geneResolution: 'result' };
}
