import type { OrganismInput } from '../gene_db/types';

// Turn free-text input into a gene reference. Natural language ("Look up TP53 in
// humans") is parsed server-side at /api/parse, where the AI key is safe. If that
// endpoint is unavailable (no key, offline, static deploy), fall back to treating
// the raw text as a gene symbol/name so the app still works.

export interface ParsedQuery {
  term: string;
  organism?: OrganismInput;
}

interface ParseResponse {
  geneQueries?: Array<{ query?: string; symbol?: string; organism?: OrganismInput }>;
  defaultOrganism?: OrganismInput;
}

export async function parseQuery(input: string): Promise<ParsedQuery> {
  const raw = input.trim();
  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: raw }),
    });
    if (!res.ok) throw new Error(`parse failed: ${res.status}`);
    const data = (await res.json()) as ParseResponse;
    const gq = data.geneQueries?.[0];
    if (gq) {
      return {
        term: gq.symbol || gq.query || raw,
        organism: gq.organism ?? data.defaultOrganism,
      };
    }
  } catch {
    // Parsing unavailable — degrade to a literal gene-term lookup.
  }
  return { term: raw };
}
