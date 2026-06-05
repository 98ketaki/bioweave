import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseInputToGeneDBRequest } from '../parser/index';

// POST /api/parse — turn a natural-language request ("Look up TP53 in humans")
// into a structured gene query using the AI parser. This runs server-side so the
// LLM API key (read from process.env via dotenv inside the parser) never reaches
// the browser. The response contains only the parsed gene query, nothing else.

const MAX_QUERY_LEN = 500;
const MAX_BODY_BYTES = 10_000;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function handleParse(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = (await readJsonBody(req)) as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) return sendJson(res, 400, { error: 'Missing "query" string.' });
    if (query.length > MAX_QUERY_LEN) return sendJson(res, 400, { error: 'Query too long.' });

    const parsed = await parseInputToGeneDBRequest(query);
    sendJson(res, 200, {
      geneQueries: parsed.geneQueries,
      defaultOrganism: parsed.defaultOrganism,
    });
  } catch (err) {
    // Surface a short reason for debugging, but never the API key or a stack trace.
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/parse] failed:', detail);
    sendJson(res, 502, { error: 'Could not understand the query.' });
  }
}
