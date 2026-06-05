export type OrganismInput = {
  scientificName: string;
  commonName?: string;
  taxId?: string;
};

export type GeneQuery = {
  query: string;
  symbol?: string;
  organism?: OrganismInput;
};

export type GeneDBRequest = {
  rawQuery?: string;
  geneQueries?: GeneQuery[];
  defaultOrganism?: OrganismInput;
};

export type NormalizedGeneRecord = {
  geneUid: string;
  officialSymbol: string;
  fullName: string | null;
  organism: OrganismInput;
  chromosomeLocation: string | null;
  description: string | null;
  refSeqSummary: string | null;
  aliases: string[];
  source: 'NCBI Gene';
};

export type GeneCandidate = {
  geneUid: string;
  officialSymbol: string | null;
  fullName: string | null;
  organism: OrganismInput | null;
  chromosomeLocation: string | null;
  summarySnippet: string | null;
};

export type GeneDBResult = {
  type: 'result';
  request: GeneQuery;
  geneRecord: NormalizedGeneRecord;
};

export type GeneDBAmbiguity = {
  type: 'ambiguity';
  request: GeneQuery;
  candidates: GeneCandidate[];
};

export type GeneDBNotFound = {
  type: 'not_found';
  request: GeneQuery;
  reason: string;
};

export type GeneDBResponse = {
  results: Array<GeneDBResult | GeneDBAmbiguity | GeneDBNotFound>;
};

export type GeneDBOptions = {
  cache?: GeneDBCache;
  maxCandidates?: number;
};

export interface GeneDBCache {
  getByGeneUid(geneUid: string): Promise<GeneDBResult | null>;
  setByGeneUid(geneUid: string, result: GeneDBResult): Promise<void>;
}
