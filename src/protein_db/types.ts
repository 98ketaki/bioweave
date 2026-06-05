import type { OrganismInput } from '../gene_db/types';

// Raw NCBI protein esummary record (only the fields we read).
export type NCBIProteinSummaryRecord = {
  uid: string;
  caption?: string;
  title?: string;
  accessionversion?: string;
  taxid?: number | string;
  organism?: string;
  slen?: number | string;
  moltype?: string;
  sourcedb?: string;
  subtype?: string;
  subname?: string;
};

// Normalized protein record — the protein-DB analogue of NormalizedGeneRecord.
export type NormalizedProteinRecord = {
  proteinUid: string;
  accession: string;
  title: string | null;
  organism: OrganismInput;
  length: number | null; // amino acids
  moleculeType: string | null;
  chromosomeLocation: string | null;
  sourceDb: string | null;
  source: 'NCBI Protein';
};
