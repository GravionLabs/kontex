import type { ContextSize, RecommendModelInput, ScoredResult, Tier } from '../types.js';
import { evaluateWithLLM } from './llm-evaluator.js';
import { getProvider, resolveModel } from './model-registry.js';

const TITLE_KEYWORDS: [RegExp, number][] = [
  [/architect|design|refacto?r|migrat|rewrite/i, 35],
  [/implement|add|create|feat/i, 20],
  [/fix|bug|typo|bump|update/i, -15],
  [/test|docs|readme/i, -10],
];

const LABEL_SCORES: [string, number][] = [
  ['enhancement', 15],
  ['bug', 5],
  ['documentation', -20],
  ['good first issue', -25],
];

const BODY_KEYWORDS: [RegExp, number][] = [
  [/cross-cutting/gi, 20],
  [/breaking change/gi, 20],
  [/migration/gi, 20],
  [/minor/gi, -10],
  [/simple/gi, -10],
  [/quick/gi, -10],
];

const CODE_BLOCK_RE = /```/g;
const FILE_PATH_RE = /`[\w./\\-]+`/g;

export function scoreTitle(title: string): { delta: number; reasons: string[] } {
  let delta = 0;
  const reasons: string[] = [];
  for (const [re, score] of TITLE_KEYWORDS) {
    if (re.test(title)) {
      delta += score;
      reasons.push(`title: ${score > 0 ? '+' : ''}${score}`);
    }
  }
  return { delta, reasons };
}

export function scoreLabels(labels: string[]): {
  delta: number;
  reasons: string[];
  labelOverride?: { tier: Tier; reason: string };
} {
  let delta = 0;
  const reasons: string[] = [];

  for (const label of labels) {
    const lower = label.toLowerCase();

    const modelMatch = lower.match(/^model:(haiku|sonnet|opus)$/);
    if (modelMatch) {
      const tierMap: Record<string, Tier> = { haiku: 'fast', sonnet: 'balanced', opus: 'powerful' };
      return {
        delta: 0,
        reasons: [`label override: ${label}`],
        labelOverride: { tier: tierMap[modelMatch[1]], reason: `Label ${label}` },
      };
    }

    if (lower === 'complexity:low') {
      delta -= 30;
      reasons.push('label: -30 (complexity:low)');
    } else if (lower === 'complexity:high') {
      delta += 40;
      reasons.push('label: +40 (complexity:high)');
    } else if (lower === 'complexity:medium') {
      reasons.push('label: no change (complexity:medium)');
    }

    for (const [keyword, score] of LABEL_SCORES) {
      if (lower.includes(keyword)) {
        delta += score;
        reasons.push(`label: ${score > 0 ? '+' : ''}${score} (${keyword})`);
      }
    }
  }

  return { delta, reasons };
}

function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export function scoreBody(body: string): {
  delta: number;
  reasons: string[];
  fileMentionCount: number;
  codeBlockCount: number;
} {
  let delta = 0;
  const reasons: string[] = [];

  const len = body.length;
  if (len > 2000) {
    delta += 20;
    reasons.push('body: +20 (>2000 chars)');
  } else if (len > 1000) {
    delta += 10;
    reasons.push('body: +10 (>1000 chars)');
  }

  const codeBlockCount = Math.min(countMatches(body, CODE_BLOCK_RE) / 2, 4);
  if (codeBlockCount > 0) {
    const pts = codeBlockCount * 5;
    delta += pts;
    reasons.push(`body: +${pts} (${codeBlockCount} code blocks)`);
  }

  const fullFileMentionCount = countMatches(body, FILE_PATH_RE);
  const cappedFileMentions = Math.min(fullFileMentionCount, 5);
  if (cappedFileMentions > 0) {
    const pts = cappedFileMentions * 3;
    delta += pts;
    reasons.push(`body: +${pts} (${cappedFileMentions} file mentions)`);
  }

  return { delta, reasons, fileMentionCount: fullFileMentionCount, codeBlockCount };
}

export function scoreBodyKeywords(body: string): { delta: number; reasons: string[] } {
  let delta = 0;
  const reasons: string[] = [];
  for (const [re, score] of BODY_KEYWORDS) {
    if (re.test(body)) {
      delta += score;
      reasons.push(`keyword: ${score > 0 ? '+' : ''}${score}`);
    }
  }
  return { delta, reasons };
}

export function determineContextSize(fileMentionCount: number): ContextSize {
  if (fileMentionCount <= 2) return 'small';
  if (fileMentionCount <= 8) return 'medium';
  return 'large';
}

export function scoreToTier(score: number): Tier {
  if (score < 25) return 'fast';
  if (score <= 60) return 'balanced';
  return 'powerful';
}

export function isBorderline(score: number): boolean {
  return (score >= 20 && score <= 30) || (score >= 55 && score <= 65);
}

export async function recommendModel(input: RecommendModelInput): Promise<{
  model: string;
  tier: Tier;
  complexityScore: number;
  contextSize: ContextSize;
  reasoning: string;
  overriddenBy: 'label' | 'llm' | 'rules';
}> {
  const labels = input.labels ?? [];

  let totalScore = 0;
  const allReasons: string[] = [];
  let fileMentionCount = 0;

  const { delta: titleDelta, reasons: titleReasons } = scoreTitle(input.title);
  totalScore += titleDelta;
  allReasons.push(...titleReasons);

  const labelResult = scoreLabels(labels);
  if (labelResult.labelOverride) {
    const provider = getProvider();
    const { model, tier } = resolveModel(provider, labelResult.labelOverride.tier, 'small');
    return {
      model,
      tier,
      complexityScore: totalScore + labelResult.delta,
      contextSize: 'small',
      reasoning: `Overridden by label: ${labelResult.labelOverride.reason}`,
      overriddenBy: 'label',
    };
  }

  totalScore += labelResult.delta;
  allReasons.push(...labelResult.reasons);

  const { delta: bodyDelta, reasons: bodyReasons, fileMentionCount: fmc } = scoreBody(input.body);
  totalScore += bodyDelta;
  allReasons.push(...bodyReasons);
  fileMentionCount = fmc;

  const { delta: keywordDelta, reasons: keywordReasons } = scoreBodyKeywords(input.body);
  totalScore += keywordDelta;
  allReasons.push(...keywordReasons);

  const contextSize = determineContextSize(fileMentionCount);

  const shouldUseLLM = input.llmEval !== false && isBorderline(totalScore);
  if (shouldUseLLM) {
    const llmResult = await evaluateWithLLM(
      input.title,
      input.body.slice(0, 500),
      process.env.ORACLE_LLM_EVAL_PROVIDER || 'anthropic',
    );
    if (llmResult !== null) {
      const blended = Math.round(totalScore * 0.7 + llmResult.complexityScore * 0.3);
      allReasons.push(
        `LLM eval: blended ${blended} (70% rules: ${totalScore} + 30% LLM: ${llmResult.complexityScore})`,
      );
      allReasons.push(`LLM reasoning: ${llmResult.reasoning}`);
      totalScore = blended;
    }
  }

  const tier = scoreToTier(totalScore);
  const provider = getProvider();
  const { model, tier: effectiveTier } = resolveModel(provider, tier, contextSize);

  return {
    model,
    tier: effectiveTier,
    complexityScore: totalScore,
    contextSize,
    reasoning: allReasons.join('; ') || 'No signals detected',
    overriddenBy: effectiveTier !== tier ? 'rules' : 'rules',
  };
}
