import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

function getProvider() {
  if (OPENAI_API_KEY) {
    return 'openai' as const;
  }
  if (ANTHROPIC_API_KEY) {
    return 'anthropic' as const;
  }
  throw new Error('No AI API key is configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.');
}

export async function queryAI(prompt: string): Promise<string> {
  const provider = getProvider();
  if (provider === 'openai') {
    return requestOpenAI(prompt);
  }
  return requestAnthropic(prompt);
}

async function requestOpenAI(prompt: string): Promise<string> {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are an assistant that extracts structured gene search queries from user input.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${payload}`);
  }

  const payload = (await response.json()) as any;
  return String(payload?.choices?.[0]?.message?.content ?? '');
}

async function requestAnthropic(prompt: string): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: 'You are an assistant that extracts structured gene search queries from user input.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${payload}`);
  }

  const payload = (await response.json()) as any;
  const blocks = payload?.content;
  if (Array.isArray(blocks)) {
    return blocks.map((b: any) => b?.text ?? '').join('');
  }
  return '';
}
