// Tiny localStorage-backed cache for gene search results.
//
// Keyed by a normalized term (lowercased + trimmed). Entries carry a schema
// version so future shape changes don't deserialize stale records, and a
// timestamp so a TTL can be applied. The cache fails silent — a quota error
// or a missing `window` (SSR / tests) must never break a search.

const KEY_PREFIX = 'bioweave:searchGene:v1:';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Entry<T> {
  ts: number;
  value: T;
}

function key(term: string): string {
  return KEY_PREFIX + term.trim().toLowerCase();
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readSearchCache<T>(term: string): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(key(term));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.ts > TTL_MS) {
      s.removeItem(key(term));
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function writeSearchCache<T>(term: string, value: T): void {
  const s = storage();
  if (!s) return;
  try {
    const entry: Entry<T> = { ts: Date.now(), value };
    s.setItem(key(term), JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage disabled — fine, cache is best-effort.
  }
}
