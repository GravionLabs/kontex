import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('hook-dispatch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resets budget on sessionStart', async () => {
    const { globalContextBudget, globalEventBus } = await import('@gravionlabs/kontex-types');
    const { initHookDispatch } = await import('../src/services/hook-dispatch.js');

    globalContextBudget.addTokens(50);
    initHookDispatch();

    globalEventBus.emit({
      timestamp: Date.now(),
      sessionId: 'sess_test',
      phase: 'sessionStart',
      data: {},
    });

    expect(globalContextBudget.usedTokens).toBe(0);
  });

  it('tracks tokens on userPromptSubmitted', async () => {
    const { globalContextBudget, globalEventBus } = await import('@gravionlabs/kontex-types');
    const { initHookDispatch } = await import('../src/services/hook-dispatch.js');

    initHookDispatch();

    globalEventBus.emit({
      timestamp: Date.now(),
      sessionId: 'sess_test',
      phase: 'userPromptSubmitted',
      data: {
        originalPrompt: 'a'.repeat(100),
        length: 100,
      },
    });

    // 100 chars / 4 = 25 tokens
    expect(globalContextBudget.usedTokens).toBe(25);
  });

  it('auto-escalates compression mode at compress threshold', async () => {
    const { globalContextBudget, globalCompressionMode, globalEventBus } = await import('@gravionlabs/kontex-types');
    const { initHookDispatch } = await import('../src/services/hook-dispatch.js');

    initHookDispatch();

    // Fill budget to 85% (compress threshold)
    // totalAllowed = 128000, need 108800 tokens
    const needed = Math.ceil(128000 * 0.85);
    const prompt = 'x'.repeat(needed * 4);

    globalEventBus.emit({
      timestamp: Date.now(),
      sessionId: 'sess_test',
      phase: 'userPromptSubmitted',
      data: {
        originalPrompt: prompt,
        length: prompt.length,
      },
    });

    expect(globalCompressionMode.level).toBe('ultra');
  });

  it('tracks tool result tokens on postToolUse', async () => {
    const { globalContextBudget, globalEventBus } = await import('@gravionlabs/kontex-types');
    const { initHookDispatch } = await import('../src/services/hook-dispatch.js');

    initHookDispatch();
    const before = globalContextBudget.usedTokens;

    globalEventBus.emit({
      timestamp: Date.now(),
      sessionId: 'sess_test',
      phase: 'postToolUse',
      data: {
        toolName: 'test-tool',
        success: true,
        duration: 100,
        result: 'a'.repeat(40), // 10 tokens
      },
    });

    expect(globalContextBudget.usedTokens).toBe(before + 10);
  });

  it('does not track non-string results on postToolUse', async () => {
    const { globalContextBudget, globalEventBus } = await import('@gravionlabs/kontex-types');
    const { initHookDispatch } = await import('../src/services/hook-dispatch.js');

    initHookDispatch();
    const before = globalContextBudget.usedTokens;

    globalEventBus.emit({
      timestamp: Date.now(),
      sessionId: 'sess_test',
      phase: 'postToolUse',
      data: {
        toolName: 'test-tool',
        success: true,
        duration: 50,
        result: { json: true },
      },
    });

    expect(globalContextBudget.usedTokens).toBe(before);
  });
});
