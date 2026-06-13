import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { listSpecFiles, loadSpecFile, searchSpecFiles } from '../src/services/markdown-loader.js';
import { summarizeContent } from '../src/services/spec-types.js';
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

describe('summarizeContent', () => {
  it('extracts first H1 heading and first paragraph', () => {
    const raw = '# My Title\n\nFirst paragraph here.\n\nSecond paragraph.';
    const result = summarizeContent(raw);

    expect(result).toContain('# My Title');
    expect(result).toContain('First paragraph here.');
    expect(result).not.toContain('Second paragraph.');
  });

  it('extracts first H2 heading when no H1 exists', () => {
    const raw = '## Section\n\nSome content.';
    const result = summarizeContent(raw);

    expect(result).toContain('# Section');
  });

  it('strips markdown decorators from paragraph', () => {
    const raw = '# Title\n\n**bold text** and _italic_ and [link](https://example.com) and `code`.';
    const result = summarizeContent(raw);

    expect(result).not.toContain('**');
    expect(result).not.toContain('_italic_');
    expect(result).toContain('bold text');
    expect(result).toContain('italic');
    expect(result).toContain('link');
    expect(result).toContain('code');
  });

  it('truncates paragraph to 120 characters', () => {
    const longText = 'x'.repeat(200);
    const raw = `# Title\n\n${longText}`;
    const result = summarizeContent(raw);
    const paragraph = result.split('\n\n')[1] ?? '';

    expect(paragraph.length).toBeLessThanOrEqual(120);
  });

  it('returns first 120 chars of raw when no heading or paragraph found', () => {
    const raw = 'a'.repeat(200);
    const result = summarizeContent(raw);

    expect(result.length).toBeLessThanOrEqual(120);
  });

  it('returns only heading when no paragraph follows', () => {
    const raw = '# Title Only';
    const result = summarizeContent(raw);

    expect(result).toContain('# Title Only');
  });

  it('summarizes yaml-like content using key fields', () => {
    const raw = 'name: assign-ticket\npurpose: Assign ticket to teammate.\nendpoint: POST /tickets/:id/assign\n';
    const result = summarizeContent(raw);

    expect(result).toContain('# assign-ticket');
    expect(result).toContain('Assign ticket to teammate.');
  });
});
