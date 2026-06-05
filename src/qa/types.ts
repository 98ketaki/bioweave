import type { GeneQuery, NormalizedGeneRecord, GeneCandidate } from '../gene_db/types';
import type { NormalizedProteinRecord } from '../protein_db/types';

export type QASource = 'gene' | 'protein' | 'pubmed';

// Output of the "understanding" LLM call: which gene(s), which NCBI sources, and
// a focused literature topic (gene symbol added programmatically, not here).
export type Understanding = {
  geneQueries: GeneQuery[];
  sources: QASource[];
  pubmedQuery?: string;
  answerFocus: string;
};

export type GeneEvidence = {
  geneRecord: NormalizedGeneRecord;
  url: string;
};

export type ProteinEvidence = {
  proteinRecord: NormalizedProteinRecord;
  url: string;
};

export type PaperEvidence = {
  pmid: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: string | null;
  url: string;
};

export type GeneResolution = 'result' | 'ambiguity' | 'not_found' | 'no_gene';

export type Evidence = {
  gene: GeneEvidence | null;
  proteins: ProteinEvidence[];
  papers: PaperEvidence[];
  geneResolution: GeneResolution;
  ambiguityCandidates?: GeneCandidate[];
  notFoundReason?: string;
};

export type Citation = {
  source: QASource;
  id: string;
  label: string;
  url: string;
};

export type Followup = {
  label: string;
  detail: { type: 'gene' | 'protein'; uid: string };
};

export type AskResult = {
  answer: string;
  usedSources: QASource[];
  citations: Citation[];
  followups: Followup[];
};

export type DetailRequest = { type: 'gene' | 'protein'; uid: string };

export type DetailResult =
  | { type: 'gene'; record: NormalizedGeneRecord }
  | { type: 'protein'; record: NormalizedProteinRecord };
