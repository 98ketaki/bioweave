import type { OrganismInput } from '../gene_db/types';
import type { NCBIProteinSummaryRecord, NormalizedProteinRecord } from './types';

function normalizeOrganism(summary: NCBIProteinSummaryRecord): OrganismInput {
  return {
    scientificName: summary.organism?.trim() || 'Unknown',
    taxId: summary.taxid !== undefined ? String(summary.taxid) : undefined,
  };
}

// Strip a trailing " [Homo sapiens]" organism suffix that NCBI appends to titles.
function cleanTitle(title: string | undefined): string | null {
  if (!title) return null;
  return title.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || null;
}

// NCBI encodes location as parallel pipe-delimited subtype/subname fields, e.g.
// subtype="chromosome|map", subname="17|17p13.1". Pull the value tagged "map".
function extractMapLocation(subtype?: string, subname?: string): string | null {
  if (!subtype || !subname) return null;
  const keys = subtype.split('|');
  const values = subname.split('|');
  const i = keys.indexOf('map');
  return i >= 0 && values[i] ? values[i].trim() : null;
}

export function normalizeProteinSummary(summary: NCBIProteinSummaryRecord): NormalizedProteinRecord {
  const len = summary.slen;
  return {
    proteinUid: String(summary.uid),
    accession: String(summary.accessionversion ?? summary.caption ?? '').trim(),
    title: cleanTitle(summary.title),
    organism: normalizeOrganism(summary),
    length: len === undefined || len === '' ? null : Number(len),
    moleculeType: summary.moltype?.trim() || null,
    chromosomeLocation: extractMapLocation(summary.subtype, summary.subname),
    sourceDb: summary.sourcedb?.trim() || null,
    source: 'NCBI Protein',
  };
}
