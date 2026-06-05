import { NCBI_BASE } from '../types';

// Shared helpers for NCBI E-utilities. JSON where possible.

export async function esearch(db: string, term: string, retmax = 5): Promise<string[]> {
  const url = `${NCBI_BASE}/esearch.fcgi?db=${db}&term=${encodeURIComponent(term)}&retmode=json&retmax=${retmax}`;
  const r = await fetch(url);
  const j = await r.json();
  return j.esearchresult?.idlist ?? [];
}

export async function esummary(db: string, ids: string[]): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const url = `${NCBI_BASE}/esummary.fcgi?db=${db}&id=${ids.join(',')}&retmode=json`;
  const r = await fetch(url);
  const j = await r.json();
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
  const r = await fetch(url);
  const j = await r.json();
  const linksets = j.linksets ?? [];
  const out: string[] = [];
  for (const ls of linksets) {
    for (const ldb of ls.linksetdbs ?? []) {
      for (const id of ldb.links ?? []) out.push(String(id));
    }
  }
  return out;
}
