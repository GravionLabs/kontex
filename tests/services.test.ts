import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { listSpecFiles, loadSpecFile, searchSpecFiles } from '../src/services/markdown-loader.js';
import { scanTeamsContext } from '../src/services/teams-scanner.js';

async function createFixtureRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'mcp-spec-server-'));
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs'), { recursive: true });

  await writeFile(
    path.join(rootDir, 'docs', 'rules.md'),
    '# Rules\n\n## Teams Context\nSupport route: Teams channel.\nEscalate incidents to the platform team.',
  );
  await writeFile(
    path.join(rootDir, 'docs', 'architecture.md'),
    '# Architecture\n\nThe server reads docs and specs only.',
  );
  await writeFile(
    path.join(rootDir, 'specs', 'endpoints.yaml'),
    'name: list-specs\npurpose: list the available files\n',
  );

  return rootDir;
}

describe('spec services', () => {
  it('lists spec files from docs and specs', async () => {
    const rootDir = await createFixtureRoot();
    const files = await listSpecFiles(rootDir);

    expect(files.map((file) => file.relativePath)).toEqual([
      'docs/architecture.md',
      'docs/rules.md',
      'specs/endpoints.yaml',
    ]);
  });

  it('loads a specific spec file', async () => {
    const rootDir = await createFixtureRoot();
    const spec = await loadSpecFile(rootDir, 'docs/rules.md');

    expect(spec.content).toContain('Teams Context');
  });

  it('searches across docs and specs', async () => {
    const rootDir = await createFixtureRoot();
    const results = await searchSpecFiles(rootDir, 'Teams channel', 5);

    expect(results[0]?.relativePath).toBe('docs/rules.md');
    expect(results[0]?.excerpt).toContain('Teams channel');
  });

  it('extracts team context from relevant documents', async () => {
    const rootDir = await createFixtureRoot();
    const context = await scanTeamsContext(rootDir, 'support');

    expect(context.join('\n')).toContain('Teams Context');
    expect(context.join('\n')).toContain('Support route');
  });
});
