const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface LLMResponse {
  complexityScore: number;
  reasoning: string;
}

export async function evaluateWithLLM(
  title: string,
  bodySnippet: string,
  provider: string,
): Promise<LLMResponse | null> {
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return null;

  const prompt = `You are a complexity analyzer. Given a GitHub issue, rate its implementation complexity from 0-100.

Title: ${title}
Body: ${bodySnippet.slice(0, 500)}

Return only valid JSON: { "complexityScore": <0-100>, "reasoning": "<brief reason>" }`;

  try {
    if (provider === 'openai') {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-5.4-nano', messages: [{ role: 'user', content: prompt }], max_tokens: 150 }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return null;
      const parsed = JSON.parse(text) as LLMResponse;
      if (typeof parsed.complexityScore === 'number' && typeof parsed.reasoning === 'string') {
        return parsed;
      }
      return null;
    }

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content: { text: string }[] };
    const text = data.content?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as LLMResponse;
    if (typeof parsed.complexityScore === 'number' && typeof parsed.reasoning === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
