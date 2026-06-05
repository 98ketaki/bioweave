import { ask } from './qa/ask.js';

const questions = [
  'What is TP53?', // gene only
  'What proteins does BRCA1 encode?', // gene + protein
  "What is known about TP53's role in apoptosis?", // gene + focused pubmed
];

async function main() {
  console.log('🧬 BioWeave Ask Demo');
  console.log('====================\n');

  for (const question of questions) {
    console.log(`Q: ${question}`);
    const result = await ask(question);
    console.log(`\nAnswer:\n${result.answer}\n`);
    console.log(`Sources used: ${result.usedSources.join(', ') || 'none'}`);
    console.log('Citations:');
    for (const c of result.citations) {
      console.log(`  - [${c.source}] ${c.label} — ${c.url}`);
    }
    console.log('Know more:');
    for (const f of result.followups) {
      console.log(`  - ${f.label} (${f.detail.type}:${f.detail.uid})`);
    }
    console.log('\n' + '-'.repeat(60) + '\n');
  }
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
