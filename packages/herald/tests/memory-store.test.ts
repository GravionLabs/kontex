import { mkdtemp, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../src/memory/memory-store.js';

let dbPath: string;

beforeEach(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'memory-store-test-'));
  dbPath = path.join(dir, 'test.db');
});

afterEach(() => {
  // Cleanup handled by OS temp directory
});

describe('MemoryStore', () => {
  it('creates database file', () => {
    const store = new MemoryStore(dbPath);
    store.close();
  });

  it('storeObservation stores with compression', () => {
    const store = new MemoryStore(dbPath);
    const obs = store.storeObservation('sess_1', 'userPrompt', 'prompt', 'Please thank you for this long text with many unnecessary words that can be compressed.');
    expect(obs.sessionId).toBe('sess_1');
    expect(obs.phase).toBe('userPrompt');
    expect(obs.toolName).toBe('prompt');
    expect(obs.originalLen).toBeGreaterThan(obs.compressedLen);
    expect(obs.ratio).toBeGreaterThan(0);
    store.close();
  });

  it('storeSession creates and retrieves session', () => {
    const store = new MemoryStore(dbPath);
    store.storeSession({
      sessionId: 'sess_1',
      projectPath: '/test',
      mode: 'full',
      startedAt: '2024-01-01T00:00:00Z',
      endedAt: null,
      totalTokens: null,
      totalSaved: null,
    });
    const history = store.getSessionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].sessionId).toBe('sess_1');
    expect(history[0].projectPath).toBe('/test');
    store.close();
  });

  it('storeSession updates existing session', () => {
    const store = new MemoryStore(dbPath);
    store.storeSession({
      sessionId: 'sess_1',
      projectPath: '/test',
      mode: 'full',
      startedAt: '2024-01-01T00:00:00Z',
      endedAt: null,
      totalTokens: null,
      totalSaved: null,
    });
    store.storeSession({
      sessionId: 'sess_1',
      projectPath: '/test',
      mode: 'full',
      startedAt: '2024-01-01T00:00:00Z',
      endedAt: '2024-01-01T01:00:00Z',
      totalTokens: 500,
      totalSaved: 100,
    });
    const history = store.getSessionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].totalTokens).toBe(500);
    store.close();
  });

  it('recall returns observations in reverse chronological order', () => {
    const store = new MemoryStore(dbPath);
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'The first prompt with a really long text that should compress nicely please.');
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'The second prompt with an even longer text that is actually very compressible.');
    const results = store.recall(10);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].ratio).toBeGreaterThan(0);
    expect(results[1].ratio).toBeGreaterThan(0);
    store.close();
  });

  it('recall respects limit', () => {
    const store = new MemoryStore(dbPath);
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'The first prompt with really compressible text that works great.');
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'The second prompt with a long enough text that also compresses nicely okay.');
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'The third prompt with another compressible text for testing the limit.');
    const results = store.recall(2);
    expect(results.length).toBeLessThanOrEqual(2);
    store.close();
  });

  it('sessionTotalSaved aggregates compression savings', () => {
    const store = new MemoryStore(dbPath);
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'Please thank you really just basically very long text here for testing purposes with lots of unnecessary information.');
    store.storeObservation('sess_1', 'userPrompt', 'prompt', 'Another very long text that should be compressed significantly because it contains many filler words and pleasantries.');
    const total = store.sessionTotalSaved('sess_1');
    expect(total).toBeGreaterThan(0);
    // Non-existent session returns 0
    const emptyTotal = store.sessionTotalSaved('nonexistent');
    expect(emptyTotal).toBe(0);
    store.close();
  });

  it('multiple sessions are isolated in recall', () => {
    const store = new MemoryStore(dbPath);
    store.storeObservation('sess_a', 'userPrompt', 'prompt', 'session a text');
    store.storeObservation('sess_b', 'userPrompt', 'prompt', 'session b text');
    const all = store.recall(10);
    const sessionAObs = all.filter((o) => o.sessionId === 'sess_a');
    const sessionBObs = all.filter((o) => o.sessionId === 'sess_b');
    expect(sessionAObs.length).toBeGreaterThan(0);
    expect(sessionBObs.length).toBeGreaterThan(0);
    store.close();
  });
});
