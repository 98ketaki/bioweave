import type { GeneQuery, OrganismInput } from '../gene_db/types';

export type ParserResult = {
  geneQueries: GeneQuery[];
  defaultOrganism: OrganismInput;
};

export type ParsedGeneQuery = GeneQuery;
