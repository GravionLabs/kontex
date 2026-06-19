export type Tier = 'fast' | 'balanced' | 'powerful';
export type ContextSize = 'small' | 'medium' | 'large';
export type Provider = 'anthropic' | 'openai' | 'google' | 'opencode';
export type OverriddenBy = 'label' | 'llm' | 'rules' | 'context-upgrade';

export interface RecommendModelInput {
  title: string;
  body: string;
  labels?: string[];
  repoLanguage?: string;
  llmEval?: boolean;
}

export interface RecommendModelOutput {
  model: string;
  tier: Tier;
  complexityScore: number;
  contextSize: ContextSize;
  reasoning: string;
  overriddenBy: OverriddenBy;
}

export interface ScoredResult {
  score: number;
  tier: Tier;
  contextSize: ContextSize;
  reasoningParts: string[];
  fileMentionCount: number;
  isBorderline: boolean;
  complexityLabelAdjustment: number;
}

export const ALL_PROVIDERS: Provider[] = ['anthropic', 'openai', 'google', 'opencode'];
export const DEFAULT_PROVIDER: Provider = 'anthropic';
