// Thin client for the Q&A backend (POST /api/ask, POST /api/detail). See
// docs/frontend-qa-design.md for the contract. The shapes here mirror
// src/qa/types.ts + src/protein_db/types.ts; we duplicate (rather than import)
// because those modules live in the backend tsconfig project.

export type CitationSource = 'gene' | 'protein' | 'pubmed';

export interface Citation {
  source: CitationSource;
  id: string;
  label: string;
  url: string;
}

export type FollowupDetail =
  | { type: 'gene'; uid: string }
  | { type: 'protein'; uid: string };

export interface Followup {
  label: string;
  detail: FollowupDetail;
}

export interface AskResult {
  answer: string;
  usedSources: CitationSource[];
  citations: Citation[];
  followups: Followup[];
}

export interface GeneRecord {
  geneUid: string;
  officialSymbol: string;
  fullName: string | null;
  organism: { scientificName: string; commonName?: string; taxId?: string };
  chromosomeLocation: string | null;
  description: string | null;
  refSeqSummary: string | null;
  aliases: string[];
  source: 'NCBI Gene';
}

export interface ProteinRecord {
  proteinUid: string;
  accession: string;
  title: string;
  organism: { scientificName: string; taxId?: string };
  length: number | null;
  moleculeType: string | null;
  chromosomeLocation: string | null;
  sourceDb: string | null;
  source: 'NCBI Protein';
}

export type DetailResult =
  | { type: 'gene'; record: GeneRecord }
  | { type: 'protein'; record: ProteinRecord };

export async function askQuestion(question: string): Promise<AskResult> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ask failed (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as AskResult;
}

export async function fetchDetail(detail: FollowupDetail): Promise<DetailResult> {
  const res = await fetch('/api/detail', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(detail),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`detail failed (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as DetailResult;
}
