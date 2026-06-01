import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getPhaseContext, getPhaseContextFromDocuments } from '../src/services/phase-scanner.js';
import { GLOBAL_CONTEXT_PATHS, PHASE_SPEC_DIRS, phaseContextPath } from '../src/services/spec-types.js';

async function createPhaseFixtureRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'mcp-phase-scanner-'));

  await mkdir(path.join(rootDir, 'specs', 'architecture'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs', 'domain'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs', 'api'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs', 'validation'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs', 'workflows'), { recursive: true });
  await mkdir(path.join(rootDir, 'specs', 'phases'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });

  await writeFile(path.join(rootDir, 'specs', 'architecture', 'rules.md'), '# Architecture Rules\nNo magic.');
  await writeFile(path.join(rootDir, 'docs', 'conventions.md'), '# Conventions\nUse camelCase.');
  await writeFile(path.join(rootDir, 'specs', 'domain', 'ticket.yaml'), 'name: ticket\nfields: [id, title]');
  await writeFile(path.join(rootDir, 'specs', 'api', 'assign-ticket.yaml'), 'endpoint: POST /tickets/:id/assign');
  await writeFile(path.join(rootDir, 'specs', 'validation', 'ticket.yaml'), 'rule: title must not be empty');
  await writeFile(path.join(rootDir, 'specs', 'workflows', 'assign.workflow.md'), '# Assign Workflow\nStep 1: validate input.');
  await writeFile(path.join(rootDir, 'specs', 'phases', 'analysis.md'), '# Analysis Phase\nUnderstand the problem.');
  await writeFile(path.join(rootDir, 'specs', 'phases', 'implementation.md'), '# Implementation Phase\nFollow conventions.');

  return rootDir;
}

describe('phase-scanner (filesystem)', () => {
  it('always loads global context paths', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'analysis');
    const paths = entries.map((e) => e.relativePath);

    for (const globalPath of GLOBAL_CONTEXT_PATHS) {
      expect(paths).toContain(globalPath);
    }
  });

  it('loads phase-specific doc for analysis', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'analysis');
    const paths = entries.map((e) => e.relativePath);

    expect(paths).toContain(phaseContextPath('analysis'));
  });

  it('loads domain and architecture dirs for analysis', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'analysis');
    const paths = entries.map((e) => e.relativePath);

    expect(paths.some((p) => p.startsWith('specs/domain/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('specs/architecture/'))).toBe(true);
  });

  it('loads api, validation, workflows dirs for implementation', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'implementation');
    const paths = entries.map((e) => e.relativePath);

    expect(paths.some((p) => p.startsWith('specs/api/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('specs/validation/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('specs/workflows/'))).toBe(true);
  });

  it('does not load domain for implementation phase', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'implementation');
    const paths = entries.map((e) => e.relativePath);

    const implementationDirs = PHASE_SPEC_DIRS['implementation'];
    expect(implementationDirs).not.toContain('specs/domain');
    expect(paths.some((p) => p.startsWith('specs/domain/'))).toBe(false);
  });

  it('does not duplicate global paths even if in phase dirs', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'analysis');
    const paths = entries.map((e) => e.relativePath);
    const archRules = paths.filter((p) => p === 'specs/architecture/rules.md');

    expect(archRules).toHaveLength(1);
  });

  it('returns empty array gracefully when no specs exist', async () => {
    const emptyRoot = await mkdtemp(path.join(os.tmpdir(), 'mcp-phase-empty-'));
    const entries = await getPhaseContext(emptyRoot, 'planning');

    expect(entries).toEqual([]);
  });

  it('includes file content', async () => {
    const rootDir = await createPhaseFixtureRoot();
    const entries = await getPhaseContext(rootDir, 'analysis');
    const rules = entries.find((e) => e.relativePath === 'specs/architecture/rules.md');

    expect(rules?.content).toContain('No magic');
  });
});

describe('getPhaseContextFromDocuments', () => {
  const documents = [
    { relativePath: 'specs/architecture/rules.md', content: 'global rules' },
    { relativePath: 'docs/conventions.md', content: 'global conventions' },
    { relativePath: 'specs/domain/ticket.yaml', content: 'domain spec' },
    { relativePath: 'specs/api/assign.yaml', content: 'api spec' },
    { relativePath: 'specs/validation/ticket.yaml', content: 'validation spec' },
    { relativePath: 'specs/workflows/assign.md', content: 'workflow spec' },
    { relativePath: 'specs/phases/analysis.md', content: 'analysis guidance' },
    { relativePath: 'specs/phases/implementation.md', content: 'implementation guidance' },
  ];

  it('returns global paths for all phases', () => {
    for (const phase of ['analysis', 'planning', 'implementation', 'testing', 'verification'] as const) {
      const entries = getPhaseContextFromDocuments(documents, phase);
      const paths = entries.map((e) => e.relativePath);

      for (const globalPath of GLOBAL_CONTEXT_PATHS) {
        expect(paths).toContain(globalPath);
      }
    }
  });

  it('returns only phase-relevant docs for analysis', () => {
    const entries = getPhaseContextFromDocuments(documents, 'analysis');
    const paths = entries.map((e) => e.relativePath);

    expect(paths).toContain('specs/phases/analysis.md');
    expect(paths.some((p) => p.startsWith('specs/domain/'))).toBe(true);
    expect(paths).not.toContain('specs/phases/implementation.md');
    expect(paths.some((p) => p.startsWith('specs/api/'))).toBe(false);
  });

  it('returns api, validation, workflow docs for implementation', () => {
    const entries = getPhaseContextFromDocuments(documents, 'implementation');
    const paths = entries.map((e) => e.relativePath);

    expect(paths.some((p) => p.startsWith('specs/api/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('specs/validation/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('specs/workflows/'))).toBe(true);
    expect(paths).toContain('specs/phases/implementation.md');
  });

  it('places global paths first, then phase doc, then directory entries', () => {
    const entries = getPhaseContextFromDocuments(documents, 'analysis');
    const paths = entries.map((e) => e.relativePath);
    const globalEnd = Math.max(...GLOBAL_CONTEXT_PATHS.map((p) => paths.indexOf(p)));
    const phaseIdx = paths.indexOf(phaseContextPath('analysis'));
    const firstDirIdx = paths.findIndex((p) => !GLOBAL_CONTEXT_PATHS.includes(p) && p !== phaseContextPath('analysis'));

    expect(globalEnd).toBeLessThan(phaseIdx);
    if (firstDirIdx !== -1) {
      expect(phaseIdx).toBeLessThan(firstDirIdx);
    }
  });

  it('does not produce duplicates', () => {
    const entries = getPhaseContextFromDocuments(documents, 'analysis');
    const paths = entries.map((e) => e.relativePath);

    expect(paths.length).toBe(new Set(paths).size);
  });

  it('returns empty array when no documents match', () => {
    const entries = getPhaseContextFromDocuments([], 'testing');

    expect(entries).toEqual([]);
  });
});
