import type { ContextSize, Provider, Tier } from '../types.js';

export const MODEL_ROSTER: Record<Provider, Record<Tier, string>> = {
  anthropic: { fast: 'claude-haiku-4-5', balanced: 'claude-sonnet-4-6', powerful: 'claude-opus-4-7' },
  openai: { fast: 'gpt-5.4-nano', balanced: 'gpt-5.4', powerful: 'gpt-5.5' },
  google: { fast: 'gemini-3-flash', balanced: 'gemini-3.5-flash', powerful: 'gemini-3.1-pro' },
  opencode: {
    fast: 'opencode/deepseek-v4-flash-free',
    balanced: 'opencode/deepseek-v4-flash',
    powerful: 'opencode/claude-sonnet-4-6',
  },
};

export interface ModelResolution {
  model: string;
  tier: Tier;
}

export function resolveModel(provider: Provider, tier: Tier, contextSize: ContextSize): ModelResolution {
  const effectiveTier = contextSize === 'large' && tier === 'fast' ? 'balanced' : tier;
  const model = MODEL_ROSTER[provider][effectiveTier];
  return { model, tier: effectiveTier };
}

export function getProvider(): Provider {
  const env = process.env.ORACLE_PREFERRED_PROVIDER;
  if (env && ['anthropic', 'openai', 'google', 'opencode'].includes(env)) {
    return env as Provider;
  }
  return 'anthropic';
}
