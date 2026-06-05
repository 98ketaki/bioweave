import { runPipeline } from './app.js';

const examples = [
  'Find the human gene for insulin',
  'Look up TP53 in humans',
  'What proteins are linked to BRCA1?',
];

async function main() {
  const exampleText = examples[1]; // Use the first example

  console.log('🧬 BioWeave Demo');
  console.log('================\n');
  console.log(`Input: "${exampleText}"\n`);

  try {
    const result = await runPipeline(exampleText);
    console.log('Results:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
