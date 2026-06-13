import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listSpecFiles, searchSpecFiles } from '../src/services/markdown-loader.js';

let tempDir: string;

async function createTempRoot(): Promise<string> {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'kontex-test-'));
  await mkdir(path.join(tempDir, 'docs'), { recursive: true });
  await mkdir(path.join(tempDir, 'specs'), { recursive: true });
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await mkdir(tempDir, { recursive: true }).then(() =>
      // cleanup is best-effort
      undefined,
    );
  }
});

describe('listSpecFiles edge cases', () => {
  it('returns empty for empty directories', async () => {
    const root = await createTempRoot();
    const files = await listSpecFiles(root, 'docs');
    expect(files).toHaveLength(0);
  });

  it('filters out non-allowed extensions', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'notes.txt'), 'text');
    await writeFile(path.join(root, 'docs', 'plan.md'), '# plan');
    const files = await listSpecFiles(root, 'docs');
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe('docs/plan.md');
  });

  it('includes only files from requested directory', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'doc.md'), '# doc');
    await writeFile(path.join(root, 'specs', 'api.yaml'), 'endpoint: /test');
    const docs = await listSpecFiles(root, 'docs');
    const specs = await listSpecFiles(root, 'specs');
    expect(docs).toHaveLength(1);
    expect(docs[0].relativePath).toContain('docs/');
    expect(specs).toHaveLength(1);
    expect(specs[0].relativePath).toContain('specs/');
  });

  it('sets kind based on extension', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'readme.md'), '# readme');
    const files = await listSpecFiles(root, 'docs');
    expect(files[0].kind).toBe('md');
  });
});

describe('searchSpecFiles edge cases', () => {
  it('returns empty when no matches', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'readme.md'), '# hello world');
    const results = await searchSpecFiles(root, 'nonexistent', 10);
    expect(results).toHaveLength(0);
  });

  it('returns excerpts with content', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'guide.md'), '# Guide\n\nThis is about authentication.');
    const results = await searchSpecFiles(root, 'authentication', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].excerpt).toBeTruthy();
    expect(results[0].relativePath).toBe('docs/guide.md');
  });

  it('limits results', async () => {
    const root = await createTempRoot();
    await writeFile(path.join(root, 'docs', 'a.md'), 'content api');
    await writeFile(path.join(root, 'docs', 'b.md'), 'content api');
    await writeFile(path.join(root, 'docs', 'c.md'), 'content api');
    const results = await searchSpecFiles(root, 'api', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
