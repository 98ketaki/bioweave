import { NCBI_BASE } from '../types';

// Shared helpers for NCBI E-utilities. JSON where possible.
//
// NCBI throttles unauthenticated traffic to ~3 req/sec per IP. We:
//   - tag every request with tool/email (NCBI's "be polite" convention)
//   - serialize all calls through a single in-process queue with a 350ms gap
// If you set VITE_NCBI_API_KEY in .env.local, the limit goes to 10/sec.

const TOOL = 'bioweave';
const EMAIL = 'bioweave@example.com';
const API_KEY = (import.meta as any).env?.VITE_NCBI_API_KEY as string | undefined;
const MIN_GAP_MS = API_KEY ? 110 : 350;

function withCommon(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  const extra = `tool=${TOOL}&email=${encodeURIComponent(EMAIL)}${API_KEY ? `&api_key=${API_KEY}` : ''}`;
  return `${url}${sep}${extra}`;
}

let queue: Promise<unknown> = Promise.resolve();
async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const out = await fn();
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    return out;
  });
  // Don't let one rejection poison the queue for the next caller.
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

async function getJson(url: string): Promise<any> {
  return rateLimited(async () => {
    const r = await fetch(withCommon(url));
    if (!r.ok) throw new Error(`NCBI ${r.status} ${r.statusText}`);
    return r.json();
  });
}

export async function esearch(db: string, term: string, retmax = 5): Promise<string[]> {
  const url = `${NCBI_BASE}/esearch.fcgi?db=${db}&term=${encodeURIComponent(term)}&retmode=json&retmax=${retmax}`;
  const j = await getJson(url);
  return j.esearchresult?.idlist ?? [];
}

export async function esummary(db: string, ids: string[]): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const url = `${NCBI_BASE}/esummary.fcgi?db=${db}&id=${ids.join(',')}&retmode=json`;
  const j = await getJson(url);
  return j.result ?? {};
}

export async function elink(
  dbfrom: string,
  db: string,
  ids: string[],
  linkname?: string,
): Promise<string[]> {
  if (!ids.length) return [];
  const ln = linkname ? `&linkname=${linkname}` : '';
  const url = `${NCBI_BASE}/elink.fcgi?dbfrom=${dbfrom}&db=${db}&id=${ids.join(',')}${ln}&retmode=json`;
  const j = await getJson(url);
  const linksets = j.linksets ?? [];
  const out: string[] = [];
  for (const ls of linksets) {
    for (const ldb of ls.linksetdbs ?? []) {
      for (const id of ldb.links ?? []) out.push(String(id));
    }
  }
  return out;
}
