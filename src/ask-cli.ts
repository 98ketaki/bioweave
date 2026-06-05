import { createInterface } from 'node:readline';
import { ask } from './qa/ask.js';
import type { AskResult } from './qa/types.js';

function printResult(res: AskResult): void {
  console.log(`\n${res.answer}\n`);
  console.log(`sources used: ${res.usedSources.join(', ') || 'none'}`);
  if (res.citations.length) {
    console.log('citations:');
    for (const c of res.citations) console.log(`  [${c.source}] ${c.label} — ${c.url}`);
  }
  if (res.followups.length) {
    console.log('know more:');
    for (const f of res.followups) console.log(`  ${f.label} (${f.detail.type}:${f.detail.uid})`);
  }
  console.log('');
}

async function answer(question: string): Promise<void> {
  try {
    printResult(await ask(question));
  } catch (e) {
    console.error('Error:', e instanceof Error ? e.message : e);
  }
}

async function repl(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'ask> ' });
  console.log('🧬 BioWeave Q&A — type a question. Ctrl-C or "exit" to quit.\n');
  rl.prompt();

  rl.on('line', async (line) => {
    const q = line.trim();
    if (!q) return rl.prompt();
    if (q === 'exit' || q === 'quit') return rl.close();
    rl.pause();
    await answer(q);
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('bye');
    process.exit(0);
  });
}

// One-shot if a question is passed as args; otherwise an interactive prompt.
const argQuestion = process.argv.slice(2).join(' ').trim();
if (argQuestion) {
  answer(argQuestion).then(() => process.exit(0));
} else {
  repl();
}
