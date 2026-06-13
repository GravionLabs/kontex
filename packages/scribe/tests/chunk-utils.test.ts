import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from '../src/services/chunk-utils.js';

describe('chunkMarkdown', () => {
  it('returns empty array for empty input', () => {
    expect(chunkMarkdown('')).toEqual([]);
  });

  it('discards content under 50 characters', () => {
    const result = chunkMarkdown('Short.');
    expect(result).toEqual([]);
  });

  it('returns a single chunk for short content', () => {
    const text = '# Hello\n' + 'x'.repeat(100);
    const result = chunkMarkdown(text);
    expect(result).length(1);
    expect(result[0].heading).toBe('Hello');
    expect(result[0].content).toContain('x'.repeat(100));
    expect(result[0].chunkIndex).toBe(0);
  });

  it('splits on headings', () => {
    const text =
      '# First\n' +
      'x'.repeat(100) +
      '\n## Second\n' +
      'y'.repeat(100);
    const result = chunkMarkdown(text);
    expect(result).length(2);
    expect(result[0].heading).toBe('First');
    expect(result[0].chunkIndex).toBe(0);
    expect(result[1].heading).toBe('Second');
    expect(result[1].chunkIndex).toBe(1);
  });

  it('splits oversized content at MAX_CHARS boundary when lines exceed limit', () => {
    const text = 'x'.repeat(1999) + '\n' + 'y'.repeat(1999);
    const result = chunkMarkdown(text);
    expect(result.length).toBe(2);
    for (const chunk of result) {
      expect(chunk.content.length).toBeLessThanOrEqual(2100);
    }
  });

  it('splits heading-delimited content into separate chunks with heading preserved', () => {
    const text = '# Big\n' + 'x'.repeat(100) + '\n## Small\n' + 'y'.repeat(100);
    const result = chunkMarkdown(text);
    expect(result.length).toBe(2);
    expect(result[0].heading).toBe('Big');
    expect(result[1].heading).toBe('Small');
    expect(result[0].content).toContain('x'.repeat(100));
    expect(result[1].content).toContain('y'.repeat(100));
  });

  it('discards chunks under 50 chars after split', () => {
    const text =
      '# A\n' +
      'x'.repeat(100) +
      '\n## B\n' +
      'tiny\n' +
      '## C\n' +
      'z'.repeat(100);
    const result = chunkMarkdown(text);
    const headings = result.map((c) => c.heading);
    expect(headings).not.toContain('B');
    expect(headings).toContain('A');
    expect(headings).toContain('C');
  });

  it('tracks heading path for nested headings', () => {
    const text =
      '# Root\n' +
      'x'.repeat(100) +
      '\n## Child\n' +
      'y'.repeat(100) +
      '\n### Grandchild\n' +
      'z'.repeat(100);
    const result = chunkMarkdown(text);
    expect(result[0].headingPath).toEqual(['Root']);
    expect(result[1].headingPath).toEqual(['Root', 'Child']);
    expect(result[2].headingPath).toEqual(['Root', 'Child', 'Grandchild']);
  });

  it('handles text without headings', () => {
    const text = 'x'.repeat(500) + '\ny'.repeat(500);
    const result = chunkMarkdown(text);
    expect(result).length(1);
    expect(result[0].heading).toBeUndefined();
    expect(result[0].headingPath).toEqual([]);
  });
});
