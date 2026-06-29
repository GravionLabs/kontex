import type { EmbeddingProvider } from '@gravionlabs/kontex-types';

/**
 * HTTP-based embedding provider.
 * Expects POST to `url` with body `{ texts: string[] }`
 * and response `{ embeddings: number[][] }`.
 */
export class HttpEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;

  constructor(
    private readonly url: string,
    model = 'remote',
    dimensions = 0,
  ) {
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      throw new Error(`Embedding HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { embeddings: number[][] };
    return data.embeddings;
  }
}

/**
 * Read env vars and return a configured EmbeddingProvider, or undefined if not configured.
 *
 * Env vars:
 *   KONTEX_EMBEDDING_URL   — HTTP endpoint URL (required to activate)
 *   KONTEX_EMBEDDING_MODEL — model name tag stored in the DB (default: "remote")
 */
export function createEmbeddingProvider(): EmbeddingProvider | undefined {
  const url = process.env.KONTEX_EMBEDDING_URL;
  if (!url) return undefined;

  const model = process.env.KONTEX_EMBEDDING_MODEL ?? 'remote';
  return new HttpEmbeddingProvider(url, model);
}
