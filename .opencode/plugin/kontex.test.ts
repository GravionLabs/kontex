import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted; use vi.hoisted so mock fns are available inside factory
const mockFns = vi.hoisted(() => ({
  storeObservation: vi.fn().mockReturnValue({
    sessionId: 'sess_test',
    phase: 'implementation',
    toolName: 'message.updated',
    originalLen: 100,
    compressedLen: 20,
    ratio: 0.2,
    compressedText: 'compressed',
  }),
  storeSession: vi.fn(),
  sessionTotalSaved: vi.fn().mockReturnValue(80),
  close: vi.fn(),
}));

vi.mock('@gravionlabs/kontex-herald/dist/memory/memory-store.js', () => ({
  MemoryStore: vi.fn(function (this: Record<string, unknown>) {
    this.storeObservation = mockFns.storeObservation;
    this.storeSession = mockFns.storeSession;
    this.sessionTotalSaved = mockFns.sessionTotalSaved;
    this.close = mockFns.close;
  }),
}));

vi.mock('@gravionlabs/kontex-compress', () => ({
  compress: vi.fn(function (text: string) {
    return {
      compressed: 'short',
      originalLen: text.length,
      compressedLen: 5,
      ratio: 5 / text.length,
    };
  }),
}));

import { globalCompressionMode } from '@gravionlabs/kontex-types';
import type { PluginInput } from '@opencode-ai/plugin';
import { server } from './kontex.js';

function makeInput(directory = '/tmp/test-project'): PluginInput {
  return {
    directory,
    worktree: directory,
    project: {} as never,
    serverUrl: new URL('http://localhost:4000'),
    $: {} as never,
    experimental_workspace: { register: vi.fn() },
    client: {} as never,
  };
}

function makeMessageUpdatedEvent(completed = true) {
  return {
    type: 'message.updated',
    properties: {
      info: {
        id: 'msg_1',
        sessionID: 'sess_opencode_1',
        role: 'assistant',
        time: { created: Date.now(), completed: completed ? Date.now() : undefined },
        modelID: 'claude-sonnet-4',
        providerID: 'github-copilot',
        tokens: { input: 500, output: 200, reasoning: 0, cache: { read: 0, write: 0 } },
        cost: 0.002,
        parentID: 'msg_0',
        mode: 'auto',
        path: { cwd: '/tmp', root: '/tmp' },
        finish: 'stop',
      },
    },
  };
}

describe('kontex opencode plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalCompressionMode.setLevel('off');
    // restore default return values after clearAllMocks
    mockFns.storeObservation.mockReturnValue({
      sessionId: 'sess_test',
      phase: 'implementation',
      toolName: 'message.updated',
      originalLen: 100,
      compressedLen: 20,
      ratio: 0.2,
      compressedText: 'compressed',
    });
    mockFns.sessionTotalSaved.mockReturnValue(80);
  });

  afterEach(() => {
    globalCompressionMode.setLevel('off');
  });

  it('exports server as Plugin function', () => {
    expect(typeof server).toBe('function');
  });

  it('initialises MemoryStore and stores session on start', async () => {
    const hooks = await server(makeInput());
    expect(hooks).toBeDefined();
    expect(mockFns.storeSession).toHaveBeenCalledOnce();
    const call = mockFns.storeSession.mock.calls[0][0];
    expect(call.mode).toBe('opencode');
    expect(call.endedAt).toBeNull();
  });

  it('event hook stores observation on message.updated (assistant, completed)', async () => {
    const hooks = await server(makeInput());
    await hooks.event!({ event: makeMessageUpdatedEvent(true) as never });
    expect(mockFns.storeObservation).toHaveBeenCalledOnce();
    const [, phase, toolName] = mockFns.storeObservation.mock.calls[0];
    expect(phase).toBe('implementation');
    expect(toolName).toBe('message.updated');
  });

  it('event hook skips non-assistant messages', async () => {
    const hooks = await server(makeInput());
    const userEvent = {
      type: 'message.updated',
      properties: { info: { role: 'user', time: { created: Date.now() } } },
    };
    await hooks.event!({ event: userEvent as never });
    expect(mockFns.storeObservation).not.toHaveBeenCalled();
  });

  it('event hook skips assistant messages without completed timestamp', async () => {
    const hooks = await server(makeInput());
    await hooks.event!({ event: makeMessageUpdatedEvent(false) as never });
    expect(mockFns.storeObservation).not.toHaveBeenCalled();
  });

  it('event hook skips unknown event types gracefully', async () => {
    const hooks = await server(makeInput());
    await hooks.event!({ event: { type: 'session.idle', properties: {} } as never });
    expect(mockFns.storeObservation).not.toHaveBeenCalled();
  });

  it('set-compression-level tool sets level and returns confirmation', async () => {
    const hooks = await server(makeInput());
    const levelTool = hooks.tool!['set-compression-level'];
    expect(levelTool).toBeDefined();
    const result = await levelTool.execute({ level: 'ultra' }, {} as never);
    expect(globalCompressionMode.level).toBe('ultra');
    expect(result).toContain('ultra');
    expect(result).toContain('%');
  });

  it('set-compression-level tool works for all valid levels', async () => {
    const hooks = await server(makeInput());
    const levelTool = hooks.tool!['set-compression-level'];
    for (const level of ['off', 'lite', 'full', 'ultra', 'wenyan'] as const) {
      const result = await levelTool.execute({ level }, {} as never);
      expect(globalCompressionMode.level).toBe(level);
      expect(typeof result).toBe('string');
    }
  });

  it('dispose writes session end record and closes store', async () => {
    const hooks = await server(makeInput());
    mockFns.storeSession.mockClear();
    await hooks.dispose!();
    expect(mockFns.sessionTotalSaved).toHaveBeenCalledOnce();
    expect(mockFns.storeSession).toHaveBeenCalledOnce();
    const call = mockFns.storeSession.mock.calls[0][0];
    expect(call.endedAt).not.toBeNull();
    expect(typeof call.endedAt).toBe('string');
    expect(call.totalSaved).toBe(80);
    expect(mockFns.close).toHaveBeenCalledOnce();
  });
});
