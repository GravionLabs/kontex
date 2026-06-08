import { describe, expect, it } from 'vitest';
import { ContextBudget } from '../src/context-budget.js';

describe('ContextBudget', () => {
  it('default totalAllowed is 128000', () => {
    const budget = new ContextBudget();
    expect(budget.totalAllowed).toBe(128000);
  });

  it('starts with zero used tokens', () => {
    const budget = new ContextBudget();
    expect(budget.usedTokens).toBe(0);
  });

  it('remaining equals totalAllowed when unused', () => {
    const budget = new ContextBudget(100);
    expect(budget.remaining).toBe(100);
  });

  it('estimateTokens uses chars/4 heuristic', () => {
    expect(ContextBudget.estimateTokens('hello')).toBe(2); // 5/4 = 1.25 → 2
    expect(ContextBudget.estimateTokens('a')).toBe(1);     // 1/4 = 0.25 → 1
    expect(ContextBudget.estimateTokens('')).toBe(0);      // 0/4 = 0 → 0
    expect(ContextBudget.estimateTokens('1234')).toBe(1);  // 4/4 = 1 → 1
    expect(ContextBudget.estimateTokens('12345')).toBe(2); // 5/4 = 1.25 → 2
  });

  it('addTokens increments used and returns ok', () => {
    const budget = new ContextBudget(100);
    const status = budget.addTokens(10);
    expect(budget.usedTokens).toBe(10);
    expect(status).toBe('ok');
  });

  it('status is warn at 70%', () => {
    const budget = new ContextBudget(100);
    budget.addTokens(70);
    expect(budget.status).toBe('warn');
  });

  it('status is compress at 85%', () => {
    const budget = new ContextBudget(100);
    budget.addTokens(85);
    expect(budget.status).toBe('compress');
  });

  it('status is panic at 95%', () => {
    const budget = new ContextBudget(100);
    budget.addTokens(95);
    expect(budget.status).toBe('panic');
  });

  it('reset clears used tokens', () => {
    const budget = new ContextBudget(100);
    budget.addTokens(50);
    budget.reset();
    expect(budget.usedTokens).toBe(0);
    expect(budget.status).toBe('ok');
  });

  it('handles overflow beyond totalAllowed', () => {
    const budget = new ContextBudget(100);
    budget.addTokens(200);
    expect(budget.usedTokens).toBe(200);
    expect(budget.status).toBe('panic');
    expect(budget.remaining).toBe(-100);
  });
});
