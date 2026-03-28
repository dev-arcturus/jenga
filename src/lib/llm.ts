import Anthropic from '@anthropic-ai/sdk';

// Model configuration: Sonnet for reasoning, Haiku for judging
export const REASONING_MODEL = 'claude-sonnet-4-20250514';
export const JUDGE_MODEL = 'claude-haiku-4-5-20251001';

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export interface LLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callLLM(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number = 0,
): Promise<LLMResult> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find(c => c.type === 'text');
  return {
    text: textBlock?.text ?? '',
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

export function parseJSON<T>(raw: string): T {
  // Try to extract JSON from the response (handle markdown code blocks)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}
