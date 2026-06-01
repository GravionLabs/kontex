import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ProjectRegistry } from '../src/services/project-registry.js';
import { SpecStore } from '../src/services/spec-store.js';

async function createProjectRoot(prefix: string, files: Record<string, string>): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs'), { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    await writeFile(path.join(rootDir, relativePath), content);
  }

  return rootDir;
}

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('sqlite spec store', () => {
  it('indexes multiple projects in one sqlite database', async () => {
    const alphaRoot = await createProjectRoot('mcp-alpha-', {
      'docs/rules.md': '# Rules\nTeam support channel.',
      'specs/endpoints.yaml': 'name: alpha-endpoint\n',
    });
    const betaRoot = await createProjectRoot('mcp-beta-', {
      'docs/workflow.md': '# Workflow\nEscalation workflow for support.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_MODE = 'sqlite';
    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'alpha';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `alpha=${alphaRoot};beta=${betaRoot}`;

    const store = new SpecStore(new ProjectRegistry(alphaRoot));
    const alphaFiles = await store.listSpecs('alpha');
    const betaFiles = await store.listSpecs('beta');

    expect(alphaFiles.map((entry) => entry.relativePath)).toContain('docs/rules.md');
    expect(betaFiles.map((entry) => entry.relativePath)).toContain('docs/workflow.md');

    const db = new Database(dbPath, { readonly: true });
    const columns = db.prepare('PRAGMA table_info(specs)').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toEqual([
      'id',
      'project',
      'type',
      'version',
      'path',
      'content',
      'raw',
      'updated_at',
    ]);
    db.close();
  });

  it('updates sqlite rows when file hashes change', async () => {
    const root = await createProjectRoot('mcp-hash-', {
      'docs/rules.md': '# Rules\nOld content',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_MODE = 'sqlite';
    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'alpha';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `alpha=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const initial = await store.loadSpec('alpha', 'docs/rules.md');
    expect(initial.content).toContain('Old content');

    const newContent = '# Rules\nNew content';
    await writeFile(path.join(root, 'docs', 'rules.md'), newContent);
    const updated = await store.loadSpec('alpha', 'docs/rules.md');
    expect(updated.content).toContain('New content');

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare('SELECT version, raw FROM specs WHERE project = ? AND path = ?')
      .get('alpha', 'docs/rules.md') as { version: string; raw: string };
    expect(row.version).toMatch(/^[0-9a-f]{64}$/);
    expect(row.raw).toContain('New content');
    db.close();
  });

  it('supports explicit reindex for all projects', async () => {
    const alphaRoot = await createProjectRoot('mcp-alpha-', {
      'docs/rules.md': '# Rules\nAlpha',
    });
    const betaRoot = await createProjectRoot('mcp-beta-', {
      'docs/rules.md': '# Rules\nBeta',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_MODE = 'sqlite';
    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'alpha';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `alpha=${alphaRoot};beta=${betaRoot}`;

    const store = new SpecStore(new ProjectRegistry(alphaRoot));
    const reindexResults = await store.reindex();
    expect(reindexResults.map((entry) => entry.project).sort()).toEqual(['alpha', 'beta']);

    const betaSpec = await store.loadSpec('beta', 'docs/rules.md');
    expect(betaSpec.content).toContain('Beta');

    const dbBytes = await readFile(dbPath);
    expect(dbBytes.byteLength).toBeGreaterThan(0);
  });
});
