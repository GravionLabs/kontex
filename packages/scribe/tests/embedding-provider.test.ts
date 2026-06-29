import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmbeddingProvider, HttpEmbeddingProvider } from '../src/services/embedding-provider.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('HttpEmbeddingProvider', () => {
  it('POSTs texts and returns embeddings', async () => {
    const mockResponse = { embeddings: [[0.1, 0.2, 0.3]] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      }),
    );

    const provider = new HttpEmbeddingProvider('http://localhost:8000/embed', 'test-model', 3);
    const result = await provider.embed(['hello world']);

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: ['hello world'] }),
    });
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
  });

  it('throws on non-OK HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );

    const provider = new HttpEmbeddingProvider('http://localhost:8000/embed');
    await expect(provider.embed(['test'])).rejects.toThrow('503');
  });

  it('exposes model and dimensions from constructor', () => {
    const provider = new HttpEmbeddingProvider('http://localhost:8000/embed', 'my-model', 768);
    expect(provider.model).toBe('my-model');
    expect(provider.dimensions).toBe(768);
  });

  it('defaults model to "remote" and dimensions to 0', () => {
    const provider = new HttpEmbeddingProvider('http://localhost:8000/embed');
    expect(provider.model).toBe('remote');
    expect(provider.dimensions).toBe(0);
  });
});

describe('createEmbeddingProvider', () => {
  it('returns undefined when KONTEX_EMBEDDING_URL is not set', () => {
    delete process.env.KONTEX_EMBEDDING_URL;
    expect(createEmbeddingProvider()).toBeUndefined();
  });

  it('returns HttpEmbeddingProvider when KONTEX_EMBEDDING_URL is set', () => {
    process.env.KONTEX_EMBEDDING_URL = 'http://localhost:8000/embed';
    delete process.env.KONTEX_EMBEDDING_MODEL;
    const provider = createEmbeddingProvider();
    expect(provider).toBeInstanceOf(HttpEmbeddingProvider);
    expect(provider?.model).toBe('remote');
  });

  it('uses KONTEX_EMBEDDING_MODEL as model name when set', () => {
    process.env.KONTEX_EMBEDDING_URL = 'http://localhost:8000/embed';
    process.env.KONTEX_EMBEDDING_MODEL = 'custom-model';
    const provider = createEmbeddingProvider();
    expect(provider?.model).toBe('custom-model');
  });
});
