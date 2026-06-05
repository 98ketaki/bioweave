import { queryAI } from '../parser/aiClient';
import type { Evidence } from './types';

const SYSTEM_PROMPT =
  'You are a biomedical assistant. Answer the user question using ONLY the evidence provided. ' +
  'Do not use outside knowledge. Cite every claim by its identifier: the gene by its official ' +
  'symbol, papers by PMID like [PMID 12345678], proteins by accession. If the evidence does not ' +
  'contain the answer, say so explicitly and state what is missing. Be concise and factual.';

function serializeEvidence(evidence: Evidence): string {
  const sections: string[] = [];

  if (evidence.geneResolution === 'ambiguity') {
    const syms = (evidence.ambiguityCandidates ?? [])
      .map((c) => c.officialSymbol)
      .filter(Boolean)
      .join(', ');
    sections.push(`NOTE: The gene could not be uniquely identified. Candidates: ${syms || 'unknown'}.`);
  } else if (evidence.geneResolution === 'not_found') {
    sections.push(`NOTE: No gene was found. ${evidence.notFoundReason ?? ''}`.trim());
  } else if (evidence.geneResolution === 'no_gene') {
    sections.push('NOTE: No gene entity could be extracted from the question.');
  }

  if (evidence.gene) {
    const g = evidence.gene.geneRecord;
    sections.push(
      [
        'GENE EVIDENCE:',
        `Symbol: ${g.officialSymbol}`,
        `Full name: ${g.fullName ?? 'n/a'}`,
        `Organism: ${g.organism.scientificName}`,
        `Location: ${g.chromosomeLocation ?? 'n/a'}`,
        `Description: ${g.description ?? 'n/a'}`,
        `RefSeq summary: ${g.refSeqSummary ?? 'n/a'}`,
        g.aliases.length ? `Aliases: ${g.aliases.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  if (evidence.proteins.length) {
    const lines = evidence.proteins.map((p) => {
      const r = p.proteinRecord;
      const len = r.length ? `, ${r.length} aa` : '';
      return `- [${r.accession}] ${r.title ?? '(protein)'} (${r.organism.scientificName}${len})`;
    });
    sections.push(`PROTEIN EVIDENCE:\n${lines.join('\n')}`);
  }

  if (evidence.papers.length) {
    const lines = evidence.papers.map((p) => {
      const head = `- [PMID ${p.pmid}]${p.year ? ` (${p.year})` : ''} ${p.title}`;
      return p.abstract ? `${head}\n  Abstract: ${p.abstract}` : head;
    });
    sections.push(`LITERATURE EVIDENCE:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

export async function synthesize(
  question: string,
  answerFocus: string,
  evidence: Evidence,
): Promise<string> {
  const prompt = `QUESTION: ${question}\nFOCUS: ${answerFocus}\n\n${serializeEvidence(evidence)}`;
  const answer = await queryAI(prompt, SYSTEM_PROMPT);
  return answer.trim();
}
