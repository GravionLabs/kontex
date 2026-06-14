import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { EmbeddingProvider } from '@gravionlabs/kontex-types';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ProjectRegistry } from '../src/services/project-registry.js';
import { SpecStore } from '../src/services/spec-store.js';

async function createProjectRoot(prefix: string, files: Record<string, string>): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs'), { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }

  return rootDir;
}

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('sqlite spec store', () => {
  it('defaults to sqlite mode when SPEC_SERVER_MODE is not set', () => {
    delete process.env.SPEC_SERVER_MODE;
    const registry = new ProjectRegistry(process.cwd());
    expect(registry.mode).toBe('sqlite');
  });

  it('opts out to filesystem mode when SPEC_SERVER_MODE=filesystem', () => {
    process.env.SPEC_SERVER_MODE = 'filesystem';
    const registry = new ProjectRegistry(process.cwd());
    expect(registry.mode).toBe('filesystem');
  });

  it('indexes multiple projects in one sqlite database', async () => {
    const alphaRoot = await createProjectRoot('mcp-alpha-', {
      'docs/rules.md': '# Rules\nTeam support channel.',
      'specs/endpoints.yaml': 'name: alpha-endpoint\n',
    });
    const betaRoot = await createProjectRoot('mcp-beta-', {
      'docs/workflow.md': '# Workflow\nEscalation workflow for support.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

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

  it('creates specs_fts virtual table alongside specs', async () => {
    const root = await createProjectRoot('mcp-fts-schema-', {
      'docs/auth.md': '# Auth\nJWT authentication token',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    await store.listSpecs('proj');

    const db = new Database(dbPath, { readonly: true });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'specs_fts%'")
      .all() as Array<{ name: string }>;
    db.close();

    expect(tables.map((t) => t.name)).toContain('specs_fts_content');
  });

  it('returns BM25-ranked results for sqlite search', async () => {
    const root = await createProjectRoot('mcp-bm25-', {
      'docs/auth.md':
        '# Auth\nJWT authentication token. Authentication is required for all endpoints. JWT must be valid.',
      'docs/overview.md': '# Overview\nSystem overview. Authentication is mentioned once here.',
      'docs/unrelated.md': '# Other\nCompletely unrelated content about deployment.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const results = await store.searchSpecs('proj', 'JWT authentication', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].relativePath).toBe('docs/auth.md');
    expect(results[0].score).toBeDefined();
    expect(results.find((r) => r.relativePath === 'docs/unrelated.md')).toBeUndefined();
  });

  it('summary mode returns truncated content for phase files, full content for global paths', async () => {
    const longParagraph = 'x'.repeat(300);
    const root = await createProjectRoot('mcp-summary-', {
      'specs/architecture/rules.md': `# Architecture Rules\n\n${longParagraph}`,
      'docs/conventions.md': `# Conventions\n\n${longParagraph}`,
      'specs/domain/ticket.md': `# Ticket Domain\n\n${longParagraph}`,
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const { entries } = await store.getContext('proj', 'analysis', { mode: 'summary' });

    const conventions = entries.find((e) => e.relativePath === 'docs/conventions.md');
    const rules = entries.find((e) => e.relativePath === 'specs/architecture/rules.md');
    const ticket = entries.find((e) => e.relativePath === 'specs/domain/ticket.md');

    // Global paths always full
    expect(conventions?.content.length).toBeGreaterThan(200);
    expect(rules?.content.length).toBeGreaterThan(200);

    // Phase-specific files are summarized
    expect(ticket?.content).toBeDefined();
    const ticketParagraph = ticket?.content.split('\n\n')[1] ?? '';
    expect(ticketParagraph.length).toBeLessThanOrEqual(120);
  });

  it('full mode returns complete content for all files', async () => {
    const longParagraph = 'y'.repeat(300);
    const root = await createProjectRoot('mcp-full-', {
      'specs/domain/ticket.md': `# Ticket Domain\n\n${longParagraph}`,
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const { entries } = await store.getContext('proj', 'analysis', { mode: 'full' });
    const ticket = entries.find((e) => e.relativePath === 'specs/domain/ticket.md');

    expect(ticket?.content.length).toBeGreaterThan(200);
  });

  it('returns version fingerprints with context entries', async () => {
    const root = await createProjectRoot('mcp-versions-', {
      'specs/architecture/rules.md': '# Architecture Rules\n\nNo magic.',
      'docs/conventions.md': '# Conventions\n\nUse camelCase.',
      'specs/domain/ticket.md': '# Ticket Domain\n\nEntity details.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const { entries } = await store.getContext('proj', 'analysis', { mode: 'summary' });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.version).toMatch(/^[0-9a-f]{64}$/);
  });

  it('skips unchanged files when known versions are provided', async () => {
    const root = await createProjectRoot('mcp-known-', {
      'specs/architecture/rules.md': '# Architecture Rules\n\nNo magic.',
      'docs/conventions.md': '# Conventions\n\nUse camelCase.',
      'specs/domain/ticket.md': '# Ticket Domain\n\nEntity details.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const initial = await store.getContext('proj', 'analysis', { mode: 'summary' });
    const knownVersions = Object.fromEntries(initial.entries.map((entry) => [entry.relativePath, entry.version]));
    const deduped = await store.getContext('proj', 'analysis', { mode: 'summary', knownVersions });

    expect(deduped.totalMatched).toBe(initial.entries.length);
    expect(deduped.entries).toEqual([]);
  });

  it('returns changed files when provided known version is stale', async () => {
    const root = await createProjectRoot('mcp-stale-', {
      'specs/architecture/rules.md': '# Architecture Rules\n\nNo magic.',
      'docs/conventions.md': '# Conventions\n\nUse camelCase.',
      'specs/domain/ticket.md': '# Ticket Domain\n\nOld details.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const initial = await store.getContext('proj', 'analysis', { mode: 'full' });
    const knownVersions = Object.fromEntries(initial.entries.map((entry) => [entry.relativePath, entry.version]));

    await writeFile(path.join(root, 'specs', 'domain', 'ticket.md'), '# Ticket Domain\n\nNew details.');

    const updated = await store.getContext('proj', 'analysis', { mode: 'full', knownVersions });

    expect(updated.entries.map((entry) => entry.relativePath)).toEqual(['specs/domain/ticket.md']);
    expect(updated.entries[0]?.content).toContain('New details.');
    expect(updated.entries[0]?.version).not.toBe(knownVersions['specs/domain/ticket.md']);
  });

  it('supports known-version dedupe in filesystem mode', async () => {
    const root = await createProjectRoot('mcp-filesystem-known-', {
      'specs/architecture/rules.md': '# Architecture Rules\n\nNo magic.',
      'docs/conventions.md': '# Conventions\n\nUse camelCase.',
      'specs/domain/ticket.md': '# Ticket Domain\n\nEntity details.',
    });

    process.env.SPEC_SERVER_MODE = 'filesystem';
    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const initial = await store.getContext('proj', 'analysis', { mode: 'summary' });
    const knownVersions = Object.fromEntries(initial.entries.map((entry) => [entry.relativePath, entry.version]));
    const deduped = await store.getContext('proj', 'analysis', { mode: 'summary', knownVersions });

    expect(deduped.totalMatched).toBe(initial.entries.length);
    expect(deduped.entries).toEqual([]);
  });

  it('falls back to FTS5 search when no embedding provider', async () => {
    const root = await createProjectRoot('mcp-noemb-', {
      'docs/auth.md': '# Auth\nAuthentication required.',
      'docs/overview.md': '# Overview\nSystem overview.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root));
    const results = await store.searchSpecs('proj', 'Authentication', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].relativePath).toBe('docs/auth.md');
    expect(results[0].score).toBeDefined();
  });

  it('reindex embeds content when embedding provider is present', async () => {
    const mockProvider: EmbeddingProvider = {
      model: 'test-model',
      dimensions: 4,
      async embed(texts: string[]) {
        return texts.map(() => [0.1, 0.2, 0.3, 0.4]);
      },
    };

    const root = await createProjectRoot('mcp-embed-', {
      'docs/rules.md': '# Rules\n' + 'x'.repeat(100) + '\nEmbed this content for embedding tests.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root), mockProvider);
    await store.listSpecs('proj');

    const db = new Database(dbPath, { readonly: false });
    const sources = db.prepare("SELECT source_type, source_key FROM sources WHERE project = 'proj'").all() as Array<{
      source_type: string;
      source_key: string;
    }>;
    expect(sources.length).toBe(1);
    expect(sources[0].source_type).toBe('spec');
    expect(sources[0].source_key).toMatch(/^docs\/rules\.md#chunk-\d+$/);

    const embeddings = db.prepare('SELECT model, vector FROM embeddings').all() as Array<{
      model: string;
      vector: string;
    }>;
    expect(embeddings.length).toBeGreaterThanOrEqual(1);
    expect(embeddings[0].model).toBe('test-model');
    expect(JSON.parse(embeddings[0].vector)).toEqual([0.1, 0.2, 0.3, 0.4]);
    db.close();
  });

  it('search uses cosine similarity when embedding provider present', async () => {
    const mockProvider: EmbeddingProvider = {
      model: 'test-model',
      dimensions: 4,
      async embed(texts: string[]) {
        return texts.map(() => [0.1, 0.2, 0.3, 0.4]);
      },
    };

    const root = await createProjectRoot('mcp-cosim-', {
      'docs/rules.md': '# Rules\n' + 'x'.repeat(100) + '\nContent about embedding for cosine similarity search tests.',
    });
    const dbPath = path.join(await mkdtemp(path.join(os.tmpdir(), 'mcp-db-')), 'specs.db');

    process.env.SPEC_SERVER_DEFAULT_PROJECT = 'proj';
    process.env.SPEC_SERVER_SQLITE_PATH = dbPath;
    process.env.SPEC_SERVER_PROJECTS = `proj=${root}`;

    const store = new SpecStore(new ProjectRegistry(root), mockProvider);
    const results = await store.searchSpecs('proj', 'embedding query', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].relativePath).toMatch(/^docs\/rules\.md/);
    expect(typeof results[0].score).toBe('number');
  });
});
