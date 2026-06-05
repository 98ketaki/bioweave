import type { GeneDBRequest } from '../gene_db/types';
import type { ParserResult } from './types';
import { queryAI } from './aiClient';

const DEFAULT_ORGANISM = { scientificName: 'Homo sapiens' };

function buildExtractionPrompt(text: string): string {
  return `Extract gene search targets from the user's request. Return only valid JSON with keys \"geneQueries\" and \"defaultOrganism\". Use \"Homo sapiens\" as the default organism if none is mentioned explicitly.

The output format should be exactly:
{
  "geneQueries": [
    {
      "query": "...",
      "symbol": "...",
      "organism": {
        "scientificName": "...",
        "commonName": "..."
      }
    }
  ],
  "defaultOrganism": {
    "scientificName": "...",
    "commonName": "..."
  }
}

If the user mentions multiple genes, include each one separately in geneQueries. If the user does not mention an organism, set defaultOrganism to {"scientificName": "Homo sapiens"} and each query organism to the same value. Do not add commentary or extra keys.

User request:
${text}`;
}

function parseJSONResponse(raw: string): ParserResult {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error('AI response did not contain JSON.');
  }

  const jsonText = raw.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonText) as ParserResult;

  if (!Array.isArray(parsed.geneQueries)) {
    throw new Error('Parsed AI response is missing geneQueries.');
  }

  return parsed;
}

export async function parseInputToGeneDBRequest(rawText: string): Promise<GeneDBRequest> {
  const prompt = buildExtractionPrompt(rawText);
  const responseText = await queryAI(prompt);
  const parsed = parseJSONResponse(responseText);

  return {
    geneQueries: parsed.geneQueries.map((query) => ({
      query: query.query,
      symbol: query.symbol,
      organism: query.organism ?? parsed.defaultOrganism ?? DEFAULT_ORGANISM,
    })),
    defaultOrganism: parsed.defaultOrganism ?? DEFAULT_ORGANISM,
  };
}
