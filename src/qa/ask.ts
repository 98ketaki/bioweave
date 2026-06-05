import { understand } from './understand';
import { gatherEvidence } from './evidence';
import { synthesize } from './synthesize';
import { buildCitations, buildFollowups } from './citations';
import type { AskResult, Evidence, QASource } from './types';

// Report only the sources we actually grounded on, so the contract never claims a
// source that returned nothing.
function effectiveSources(requested: QASource[], evidence: Evidence): QASource[] {
  const used: QASource[] = [];
  if (evidence.gene) used.push('gene');
  if (requested.includes('protein') && evidence.proteins.length) used.push('protein');
  if (requested.includes('pubmed') && evidence.papers.length) used.push('pubmed');
  return used;
}

export async function ask(question: string): Promise<AskResult> {
  const understanding = await understand(question);
  const evidence = await gatherEvidence(understanding);
  const answer = await synthesize(question, understanding.answerFocus, evidence);
  const usedSources = effectiveSources(understanding.sources, evidence);

  return {
    answer,
    usedSources,
    citations: buildCitations(evidence, usedSources),
    followups: buildFollowups(evidence),
  };
}
