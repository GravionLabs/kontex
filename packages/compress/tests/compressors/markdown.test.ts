import { describe, it, expect } from 'vitest';
import { compressMarkdown } from '../../src/compressors/markdown.js';

describe('compressMarkdown', () => {
  it('returns empty for empty input', () => {
    const r = compressMarkdown('', 'full');
    expect(r.compressed).toBe('');
    expect(r.ratio).toBe(0);
  });

  it('returns content unchanged at off level', () => {
    const content = '# Hello\n\nSome body text.';
    const r = compressMarkdown(content, 'off');
    expect(r.compressed).toBe(content);
    expect(r.ratio).toBe(0);
  });

  it('preserves headings at all levels', () => {
    const content = '# H1\n\n## H2\n\n### H3\n\nBody here.';
    const r = compressMarkdown(content, 'full');
    expect(r.compressed).toContain('# H1');
    expect(r.compressed).toContain('## H2');
    expect(r.compressed).toContain('### H3');
  });

  it('keeps first sentence per section at full', () => {
    const content = '# Title\n\nFirst sentence here. Second sentence dropped.\n\n## Sub\n\nKeep this. Lose this.';
    const r = compressMarkdown(content, 'full');
    expect(r.compressed).toContain('First sentence here.');
    expect(r.compressed).not.toContain('Second sentence dropped');
    expect(r.compressed).toContain('Keep this.');
    expect(r.compressed).not.toContain('Lose this.');
  });

  it('only keeps h1-h2 body at ultra/wenyan', () => {
    const content = '# H1\n\nImportant body.\n\n## H2\n\nAlso important.\n\n### H3\n\nThis goes.';
    const r = compressMarkdown(content, 'ultra');
    expect(r.compressed).toContain('# H1');
    expect(r.compressed).toContain('## H2');
    expect(r.compressed).toContain('### H3');
    expect(r.compressed).not.toContain('This goes.');
  });

  it('preserves code fences', () => {
    const content = '# Code\n\n```\nconst x = 1;\n```\n\nSome text.';
    const r = compressMarkdown(content, 'full');
    expect(r.compressed).toContain('```');
    expect(r.compressed).toContain('const x = 1');
  });

  it('removes fillers from body text', () => {
    const content = '# Title\n\nThis is basically just a really simple example.';
    const r = compressMarkdown(content, 'full');
    expect(r.compressed).not.toContain('basically');
    expect(r.compressed).not.toContain('just');
    expect(r.compressed).not.toContain('really');
  });

  it('calculates ratio correctly', () => {
    const content = '# A\n\n' + 'Word '.repeat(50);
    const r = compressMarkdown(content, 'ultra');
    expect(r.ratio).toBeGreaterThan(0);
    expect(r.originalLen).toBe(content.length);
  });
});
