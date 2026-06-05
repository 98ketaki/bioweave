import type { Citation, Evidence, Followup, QASource } from './types';

export function geneUrl(uid: string): string {
  return `https://www.ncbi.nlm.nih.gov/gene/${uid}`;
}

export function proteinUrl(uid: string): string {
  return `https://www.ncbi.nlm.nih.gov/protein/${uid}`;
}

export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}`;
}

// Build the source list backing the answer, limited to the sources actually used.
export function buildCitations(evidence: Evidence, used: QASource[]): Citation[] {
  const citations: Citation[] = [];

  if (used.includes('gene') && evidence.gene) {
    const g = evidence.gene.geneRecord;
    citations.push({
      source: 'gene',
      id: g.geneUid,
      label: `${g.officialSymbol} (NCBI Gene)`,
      url: evidence.gene.url,
    });
  }

  if (used.includes('protein')) {
    for (const p of evidence.proteins) {
      const r = p.proteinRecord;
      citations.push({
        source: 'protein',
        id: r.proteinUid,
        label: `${r.accession}${r.title ? ` — ${r.title}` : ''}`,
        url: p.url,
      });
    }
  }

  if (used.includes('pubmed')) {
    for (const paper of evidence.papers) {
      citations.push({ source: 'pubmed', id: paper.pmid, label: `PMID ${paper.pmid}`, url: paper.url });
    }
  }

  return citations;
}

// "Know more" affordances: the gene record, plus the first protein if any.
export function buildFollowups(evidence: Evidence): Followup[] {
  const followups: Followup[] = [];

  if (evidence.gene) {
    const g = evidence.gene.geneRecord;
    followups.push({
      label: `Know more: full ${g.officialSymbol} gene record`,
      detail: { type: 'gene', uid: g.geneUid },
    });
  }

  const firstProtein = evidence.proteins[0];
  if (firstProtein) {
    const r = firstProtein.proteinRecord;
    followups.push({
      label: `Know more: protein ${r.accession}`,
      detail: { type: 'protein', uid: r.proteinUid },
    });
  }

  return followups;
}
