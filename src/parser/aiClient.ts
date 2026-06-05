import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/complete';

const DEFAULT_SYSTEM_PROMPT =
  'You are an assistant that extracts structured gene search queries from user input.';

function getProvider() {
  if (OPENAI_API_KEY) {
    return 'openai' as const;
  }
  if (ANTHROPIC_API_KEY) {
    return 'anthropic' as const;
  }
  throw new Error('No AI API key is configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.');
}

export async function queryAI(prompt: string, systemPrompt: string = DEFAULT_SYSTEM_PROMPT): Promise<string> {
  const provider = getProvider();
  if (provider === 'openai') {
    return requestOpenAI(prompt, systemPrompt);
  }
  return requestAnthropic(prompt, systemPrompt);
}

async function requestOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
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

async function requestAnthropic(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANTHROPIC_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'claude-3.5-sonic',
      prompt: `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:`,
      max_tokens_to_sample: 800,
      temperature: 0,
      stop_sequences: ['\n\nHuman:'],
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${payload}`);
  }

  const payload = (await response.json()) as any;
  return String(payload?.completion ?? '');
}
