import { parseInputToGeneDBRequest } from './parser/index.js';
import { resolveGenes } from './gene_db/index.js';

export async function runPipeline(rawText: string) {
  const request = await parseInputToGeneDBRequest(rawText);
  return resolveGenes(request);
}
