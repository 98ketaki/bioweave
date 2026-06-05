import { queryAI } from '../parser/aiClient';
import type { GeneQuery, OrganismInput } from '../gene_db/types';
import type { QASource, Understanding } from './types';

const DEFAULT_ORGANISM: OrganismInput = { scientificName: 'Homo sapiens' };
const VALID_SOURCES: QASource[] = ['gene', 'protein', 'pubmed'];

const SYSTEM_PROMPT =
  'You route biomedical questions to NCBI data sources and extract the gene entity. Output only JSON.';

type RawUnderstanding = {
  geneQueries?: Array<{ query?: string; symbol?: string; organism?: OrganismInput }>;
  defaultOrganism?: OrganismInput;
  sources?: string[];
  pubmedQuery?: string;
  answerFocus?: string;
};

function buildPrompt(question: string): string {
  return `From the user's biomedical question, identify the gene(s) involved and decide which NCBI data sources are needed to answer it. Return only valid JSON in exactly this shape:
{
  "geneQueries": [
    { "query": "...", "symbol": "...", "organism": { "scientificName": "...", "commonName": "..." } }
  ],
  "defaultOrganism": { "scientificName": "Homo sapiens" },
  "sources": ["gene", "protein", "pubmed"],
  "pubmedQuery": "...",
  "answerFocus": "..."
}

Rules:
- "geneQueries": the gene(s) the question is about. "symbol" is the official gene symbol (e.g. insulin -> INS). Default organism to {"scientificName": "Homo sapiens"} if none is stated.
- "sources": which databases are needed. Always include "gene". Add "protein" when the question is about the protein product, isoforms, or structure. Add "pubmed" when the question is about the gene's role, function, mechanism, disease association, or "what is known".
- "pubmedQuery": focused topic terms ONLY (do NOT include the gene symbol — it is added automatically). Omit this key if there is no specific topic.
- "answerFocus": a one-line restatement of what the user wants answered.
- Return only the JSON object, no commentary.

User question:
${question}`;
}

function parseJSON(raw: string): RawUnderstanding {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error('AI response did not contain JSON.');
  }
  return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as RawUnderstanding;
}

function normalizeSources(raw: string[] | undefined): QASource[] {
  const set = new Set<QASource>(['gene']); // gene is always implied
  for (const s of raw ?? []) {
    const lower = String(s).toLowerCase();
    if ((VALID_SOURCES as string[]).includes(lower)) set.add(lower as QASource);
  }
  return VALID_SOURCES.filter((s) => set.has(s));
}

export async function understand(question: string): Promise<Understanding> {
  const responseText = await queryAI(buildPrompt(question), SYSTEM_PROMPT);
  const parsed = parseJSON(responseText);

  if (!Array.isArray(parsed.geneQueries) || parsed.geneQueries.length === 0) {
    throw new Error('Understanding response is missing geneQueries.');
  }

  const defaultOrganism = parsed.defaultOrganism ?? DEFAULT_ORGANISM;
  const geneQueries: GeneQuery[] = parsed.geneQueries.map((q) => ({
    query: String(q.query ?? q.symbol ?? '').trim(),
    symbol: q.symbol,
    organism: q.organism ?? defaultOrganism,
  }));

  const pubmedQuery = parsed.pubmedQuery?.trim() ? parsed.pubmedQuery.trim() : undefined;

  return {
    geneQueries,
    sources: normalizeSources(parsed.sources),
    pubmedQuery,
    answerFocus: parsed.answerFocus?.trim() || question,
  };
}
