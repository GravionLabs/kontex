import { describe, it, expect } from 'vitest';
import { compressDiff } from '../../src/compressors/diff.js';

describe('compressDiff', () => {
  it('returns empty for empty input', () => {
    const r = compressDiff('', 'full');
    expect(r.compressed).toBe('');
    expect(r.ratio).toBe(0);
  });

  it('returns content at off level', () => {
    const content = '--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new';
    const r = compressDiff(content, 'off');
    expect(r.compressed).toBe(content);
    expect(r.ratio).toBe(0);
  });

  it('keeps headers, hunks, and additions/removals', () => {
    const content = '--- a/foo.ts\n+++ b/foo.ts\n@@ -1,5 +1,6 @@\n-old line\n+new line\n context line';
    const r = compressDiff(content, 'full');
    expect(r.compressed).toContain('--- a/foo.ts');
    expect(r.compressed).toContain('+++ b/foo.ts');
    expect(r.compressed).toContain('@@ -1,5 +1,6 @@');
    expect(r.compressed).toContain('-old line');
    expect(r.compressed).toContain('+new line');
    expect(r.compressed).toContain(' context line');
  });

  it('drops context lines at ultra/wenyan', () => {
    const content = '--- a/foo.ts\n+++ b/foo.ts\n@@ -1 +1 @@\n-removed\n+added\n unchanged context';
    const r = compressDiff(content, 'ultra');
    expect(r.compressed).toContain('-removed');
    expect(r.compressed).toContain('+added');
    expect(r.compressed).not.toContain('unchanged context');
  });

  it('handles multi-hunk diff', () => {
    const content = '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n@@ -10 +10 @@\n-c\n+d';
    const r = compressDiff(content, 'full');
    expect(r.compressed).toContain('@@ -1 +1 @@');
    expect(r.compressed).toContain('@@ -10 +10 @@');
    expect(r.compressed).toContain('-a');
    expect(r.compressed).toContain('+b');
    expect(r.compressed).toContain('-c');
    expect(r.compressed).toContain('+d');
  });

  it('calculates ratio', () => {
    const content = ['--- a/x', '+++ b/x', '@@ -1 +1 @@', '-old', '+new', ' context'].join('\n');
    const r = compressDiff(content, 'full');
    expect(r.ratio).toBeGreaterThanOrEqual(0);
    expect(r.originalLen).toBe(content.length);
  });
});
