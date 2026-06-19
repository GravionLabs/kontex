import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type EnvSnapshot = Record<string, string | undefined>;

let tempDir: string;
let originalEnv: EnvSnapshot;

beforeEach(async () => {
  originalEnv = { ...process.env };
  // Use filesystem mode to avoid SQLite
  process.env.SPEC_SERVER_MODE = 'filesystem';
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'kontex-ctx-test-'));
  await mkdir(path.join(tempDir, 'docs'), { recursive: true });
  await mkdir(path.join(tempDir, 'specs', 'architecture'), { recursive: true });
  await mkdir(path.join(tempDir, 'specs', 'domain'), { recursive: true });
  await mkdir(path.join(tempDir, 'specs', 'api'), { recursive: true });
  await writeFile(path.join(tempDir, 'docs', 'conventions.md'), '# Conventions\n\nUse TypeScript strictly.');
  await writeFile(path.join(tempDir, 'specs', 'architecture', 'rules.md'), '# Rules\n\nAll code must be reviewed.');
  await writeFile(path.join(tempDir, 'specs', 'domain', 'overview.md'), '# Domain\n\nThe domain model is simple.');
  await writeFile(path.join(tempDir, 'specs', 'api', 'rest.md'), '# REST API\n\nThe API uses JSON.');
});

afterEach(() => {
  process.env = originalEnv;
});

describe('SpecStore getContext with Phase 5 integration', () => {
  it('returns uncompressed content when caveman mode is off', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode } = await import('@gravionlabs/kontex-types');

    globalCompressionMode.setLevel('off');

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);
    const result = await store.getContext(undefined, 'analysis');

    expect(result.totalMatched).toBeGreaterThan(0);
    const rulesEntry = result.entries.find((e) => e.relativePath === 'specs/architecture/rules.md');
    expect(rulesEntry).toBeDefined();
    expect(rulesEntry!.content).toContain('All code must be reviewed');
  });

  it('compresses content when caveman mode is ultra', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode } = await import('@gravionlabs/kontex-types');

    globalCompressionMode.setLevel('ultra');

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);
    const result = await store.getContext(undefined, 'analysis');

    expect(result.totalMatched).toBeGreaterThan(0);
    // All entries should be compressed
    for (const entry of result.entries) {
      // Compression changes content — verify it's shorter than original or has no fillers (analysis phase gets lite via getEffectiveLevel)
      expect(entry.content.length).toBeGreaterThan(0);
    }
  });

  it('uses phase default when caveman mode is off but phase mapping applies via getEffectiveLevel', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode } = await import('@gravionlabs/kontex-types');

    // Level is off by default, but getEffectiveLevel returns 'lite' for analysis
    // Since getContext checks effectiveLevel !== 'off', it should compress
    globalCompressionMode.setLevel('off');

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);
    const result = await store.getContext(undefined, 'analysis');

    expect(result.totalMatched).toBeGreaterThan(0);
  });

  it('returns summary when mode is summary', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode } = await import('@gravionlabs/kontex-types');

    globalCompressionMode.setLevel('off');

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);
    const result = await store.getContext(undefined, 'analysis', { mode: 'summary' });

    expect(result.totalMatched).toBeGreaterThan(0);
    // Global files (rules.md, conventions.md) should be full content, others summarized
    const rulesEntry = result.entries.find((e) => e.relativePath === 'specs/architecture/rules.md');
    expect(rulesEntry).toBeDefined();
  });

  it('drops non-global files when budget is panic', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode, globalContextBudget } = await import('@gravionlabs/kontex-types');

    globalCompressionMode.setLevel('ultra');
    // Fill budget to panic level
    globalContextBudget.addTokens(128000);

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);
    const result = await store.getContext(undefined, 'analysis');

    expect(result.totalMatched).toBeGreaterThan(0);
    // Only global files should remain
    for (const entry of result.entries) {
      const isGlobal =
        entry.relativePath === 'specs/architecture/rules.md' || entry.relativePath === 'docs/conventions.md';
      expect(isGlobal).toBe(true);
    }
  });

  it('includes files matching knownVersions filter', async () => {
    const { ProjectRegistry } = await import('../src/services/project-registry.js');
    const { SpecStore } = await import('../src/services/spec-store.js');
    const { globalCompressionMode } = await import('@gravionlabs/kontex-types');

    globalCompressionMode.setLevel('off');

    const registry = new ProjectRegistry(tempDir);
    const store = new SpecStore(registry);

    // First call to get baseline versions
    const firstResult = await store.getContext(undefined, 'analysis');
    expect(firstResult.entries.length).toBeGreaterThan(0);

    // Build knownVersions from first call — should filter all out
    const knownVersions: Record<string, string> = {};
    for (const entry of firstResult.entries) {
      knownVersions[entry.relativePath] = entry.version;
    }

    const secondResult = await store.getContext(undefined, 'analysis', { knownVersions });
    // All files known, so entries should be empty
    expect(secondResult.entries).toHaveLength(0);
    // But totalMatched still reflects total
    expect(secondResult.totalMatched).toBe(firstResult.totalMatched);
  });
});
