import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as yamlParse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { parseFrontmatter, type SpecStatus } from '../src/services/spec-types.js';

const VALID_STATUSES: readonly SpecStatus[] = ['draft', 'approved', 'deprecated'];

const TEMPLATES_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/templates',
);

function templatePath(...segments: string[]): string {
  return path.join(TEMPLATES_ROOT, ...segments);
}

async function readTemplate(...segments: string[]): Promise<string> {
  return readFile(templatePath(...segments), 'utf-8');
}

function assertNonEmptyHeading(content: string, file: string): void {
  const match = content.match(/^#{1,6} (.+)/m);
  expect(match, `${file} must have a non-empty heading`).not.toBeNull();
  expect(match![1].trim().length, `${file} heading must not be empty`).toBeGreaterThan(0);
}

describe('spec catalog templates — deploy (#78)', () => {
  it('specs/phases/deploy.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'phases', 'deploy.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'deploy.md');
  });

  it('specs/deploy/runbook.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'deploy', 'runbook.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'runbook.md');
  });

  it('specs/deploy/environments.yaml parses as valid YAML with environments key', async () => {
    const raw = await readTemplate('specs', 'deploy', 'environments.yaml');
    const parsed = yamlParse(raw) as Record<string, unknown>;
    expect(parsed).toBeDefined();
    expect(parsed).toHaveProperty('environments');
    expect(Array.isArray(parsed['environments'])).toBe(true);
    expect((parsed['environments'] as unknown[]).length).toBeGreaterThan(0);
    // status key present and valid
    expect(VALID_STATUSES).toContain(parsed['status']);
  });

  it('specs/deploy/observability.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'deploy', 'observability.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'observability.md');
  });
});

describe('spec catalog templates — refinement & test (#79)', () => {
  it('specs/refinement/open-questions.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'refinement', 'open-questions.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'open-questions.md');
  });

  it('specs/backlog/pbi-template.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'backlog', 'pbi-template.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'pbi-template.md');
  });

  it('specs/decisions/adr-template.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'decisions', 'adr-template.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'adr-template.md');
  });

  it('specs/events/event-template.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'events', 'event-template.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'event-template.md');
  });

  it('specs/validation/test-matrix.md has valid frontmatter and heading', async () => {
    const raw = await readTemplate('specs', 'validation', 'test-matrix.md');
    const fm = parseFrontmatter(raw);
    expect(VALID_STATUSES).toContain(fm.status);
    assertNonEmptyHeading(raw, 'test-matrix.md');
  });
});
