import type { NormalizedGeneRecord, OrganismInput } from './types';
import type { NCBISummaryRecord } from './ncbiClient';

function normalizeOrganism(organism: NCBISummaryRecord['organism'] | undefined): OrganismInput {
  return {
    scientificName: organism?.scientificname ?? 'Homo sapiens',
    commonName: organism?.commonname ?? undefined,
    taxId: organism?.taxid ? String(organism.taxid) : undefined,
  };
}

function normalizeAliases(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return String(raw)
    .split(/[,;|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

export function normalizeGeneSummary(summary: NCBISummaryRecord): NormalizedGeneRecord {
  const organism = normalizeOrganism(summary.organism);

  return {
    geneUid: String(summary.uid),
    officialSymbol: String(summary.nomenclaturesymbol ?? summary.name ?? '').trim(),
    fullName: summary.nomenclaturename ? String(summary.nomenclaturename).trim() : null,
    organism,
    chromosomeLocation: summary.chromosome ? String(summary.chromosome).trim() : null,
    description: summary.description ? String(summary.description).trim() : null,
    refSeqSummary: summary.summary ? String(summary.summary).trim() : null,
    aliases: normalizeAliases(summary.otheraliases),
    source: 'NCBI Gene',
  };
}
