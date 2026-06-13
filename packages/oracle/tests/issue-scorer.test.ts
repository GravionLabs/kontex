import { describe, it, expect } from 'vitest';
import {
  scoreTitle,
  scoreLabels,
  scoreBody,
  scoreBodyKeywords,
  determineContextSize,
  scoreToTier,
  isBorderline,
  recommendModel,
} from '../src/services/issue-scorer.js';

describe('scoreTitle', () => {
  it('adds +35 for architect/design/refactor/migrate/rewrite', () => {
    expect(scoreTitle('architect the new module').delta).toBe(35);
    expect(scoreTitle('design the API').delta).toBe(35);
    expect(scoreTitle('refactor auth middleware').delta).toBe(35);
    expect(scoreTitle('migrate to ESM').delta).toBe(35);
    expect(scoreTitle('rewrite parser').delta).toBe(35);
  });

  it('adds +20 for implement/add/create/feat', () => {
    expect(scoreTitle('implement search').delta).toBe(20);
    expect(scoreTitle('add dark mode').delta).toBe(20);
    expect(scoreTitle('create user page').delta).toBe(20);
    expect(scoreTitle('feat: add login').delta).toBe(20);
  });

  it('subtracts 15 for fix/bug/typo/bump/update', () => {
    expect(scoreTitle('fix: login crash').delta).toBe(-15);
    expect(scoreTitle('bug: null pointer').delta).toBe(-15);
    expect(scoreTitle('bump dependencies').delta).toBe(-15);
    expect(scoreTitle('typo in comment').delta).toBe(-15);
    expect(scoreTitle('config update').delta).toBe(-15);
  });

  it('subtracts 10 for test/docs/readme', () => {
    expect(scoreTitle('write docs').delta).toBe(-10);
    expect(scoreTitle('missing docs').delta).toBe(-10);
    expect(scoreTitle('README formatting').delta).toBe(-10);
  });

  it('returns 0 and empty reasons for neutral title', () => {
    const result = scoreTitle('something else entirely');
    expect(result.delta).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });
});

describe('scoreLabels', () => {
  it('short-circuits on model:haiku/sonnet/opus label', () => {
    const result = scoreLabels(['model:haiku', 'bug']);
    expect(result.labelOverride?.tier).toBe('fast');
    expect(result.labelOverride?.reason).toContain('model:haiku');

    expect(scoreLabels(['model:sonnet']).labelOverride?.tier).toBe('balanced');
    expect(scoreLabels(['model:opus']).labelOverride?.tier).toBe('powerful');
  });

  it('adjusts score for complexity labels', () => {
    expect(scoreLabels(['complexity:low']).delta).toBe(-30);
    expect(scoreLabels(['complexity:high']).delta).toBe(40);
    expect(scoreLabels(['complexity:medium']).delta).toBe(0);
  });

  it('scores enhancement +15, bug +5', () => {
    expect(scoreLabels(['enhancement']).delta).toBe(15);
    expect(scoreLabels(['bug']).delta).toBe(5);
  });

  it('scores documentation -20, good first issue -25', () => {
    expect(scoreLabels(['documentation']).delta).toBe(-20);
    expect(scoreLabels(['good first issue']).delta).toBe(-25);
  });

  it('returns 0 for no labels', () => {
    const result = scoreLabels([]);
    expect(result.delta).toBe(0);
    expect(result.labelOverride).toBeUndefined();
  });

  it('stacks multiple label scores', () => {
    const result = scoreLabels(['enhancement', 'bug']);
    expect(result.delta).toBe(20);
  });
});

describe('scoreBody', () => {
  it('adds +20 for body > 2000 chars', () => {
    const body = 'x'.repeat(2001);
    expect(scoreBody(body).delta).toBe(20);
  });

  it('adds +10 for body 1001-2000 chars', () => {
    const body = 'x'.repeat(1001);
    expect(scoreBody(body).delta).toBe(10);
  });

  it('adds +5 per code block (max 4)', () => {
    const body = '```\ncode\n```\n```\nmore\n```';
    const result = scoreBody(body);
    expect(result.codeBlockCount).toBe(2);
    expect(result.delta).toBe(10);
  });

  it('caps code block count at 4', () => {
    const body = Array.from({ length: 10 }, () => '```\nx\n```').join('\n');
    expect(scoreBody(body).codeBlockCount).toBe(4);
  });

  it('adds +3 per file mention (max 5)', () => {
    const body = 'see `src/foo.ts` and `src/bar.ts`';
    const result = scoreBody(body);
    expect(result.fileMentionCount).toBe(2);
    expect(result.delta).toBe(6);
  });

  it('returns 0 for short body with no code or file mentions', () => {
    const result = scoreBody('short body');
    expect(result.delta).toBe(0);
    expect(result.fileMentionCount).toBe(0);
    expect(result.codeBlockCount).toBe(0);
  });
});

describe('scoreBodyKeywords', () => {
  it('adds +20 for cross-cutting, breaking change, migration', () => {
    expect(scoreBodyKeywords('cross-cutting concern').delta).toBe(20);
    expect(scoreBodyKeywords('breaking change required').delta).toBe(20);
    expect(scoreBodyKeywords('database migration').delta).toBe(20);
  });

  it('subtracts 10 for minor, simple, quick', () => {
    expect(scoreBodyKeywords('minor fix').delta).toBe(-10);
    expect(scoreBodyKeywords('simple change').delta).toBe(-10);
    expect(scoreBodyKeywords('quick update').delta).toBe(-10);
  });
});

describe('determineContextSize', () => {
  it('returns small for ≤2 file mentions', () => {
    expect(determineContextSize(0)).toBe('small');
    expect(determineContextSize(2)).toBe('small');
  });

  it('returns medium for 3-8 file mentions', () => {
    expect(determineContextSize(3)).toBe('medium');
    expect(determineContextSize(8)).toBe('medium');
  });

  it('returns large for >8 file mentions', () => {
    expect(determineContextSize(9)).toBe('large');
    expect(determineContextSize(20)).toBe('large');
  });
});

describe('scoreToTier', () => {
  it('fast for score < 25', () => {
    expect(scoreToTier(0)).toBe('fast');
    expect(scoreToTier(24)).toBe('fast');
  });

  it('balanced for score 25-60', () => {
    expect(scoreToTier(25)).toBe('balanced');
    expect(scoreToTier(60)).toBe('balanced');
  });

  it('powerful for score > 60', () => {
    expect(scoreToTier(61)).toBe('powerful');
    expect(scoreToTier(100)).toBe('powerful');
  });
});

describe('isBorderline', () => {
  it('returns true for score 20-30', () => {
    expect(isBorderline(20)).toBe(true);
    expect(isBorderline(25)).toBe(true);
    expect(isBorderline(30)).toBe(true);
  });

  it('returns true for score 55-65', () => {
    expect(isBorderline(55)).toBe(true);
    expect(isBorderline(60)).toBe(true);
    expect(isBorderline(65)).toBe(true);
  });

  it('returns false for scores outside borderline ranges', () => {
    expect(isBorderline(10)).toBe(false);
    expect(isBorderline(40)).toBe(false);
    expect(isBorderline(80)).toBe(false);
  });
});

describe('recommendModel', () => {
  it('returns fast tier for simple fix title', async () => {
    const result = await recommendModel({ title: 'fix typo in readme', body: 'a typo' });
    expect(result.tier).toBe('fast');
    expect(result.complexityScore).toBeLessThan(25);
    expect(result.model).toContain('haiku');
    expect(result.contextSize).toBe('small');
    expect(result.reasoning).toBeTruthy();
    expect(result.overriddenBy).toBe('rules');
  });

  it('returns powerful for architect title', async () => {
    const result = await recommendModel({ title: 'architect the new module system', body: 'x'.repeat(3000), labels: ['enhancement'] });
    expect(result.tier).toBe('powerful');
    expect(result.model).toContain('opus');
  });

  it('short-circuits on label override', async () => {
    const result = await recommendModel({ title: 'anything', body: 'body', labels: ['model:opus'] });
    expect(result.tier).toBe('powerful');
    expect(result.overriddenBy).toBe('label');
  });

  it('upgrades fast to balanced when context is large', async () => {
    const body = Array.from({ length: 10 }, (_, i) => '`src/file' + i + '.ts`').join(' ');
    const result = await recommendModel({ title: 'fix typo', body, labels: [] });
    expect(result.contextSize).toBe('large');
    expect(result.tier).toBe('balanced');
  });
});
