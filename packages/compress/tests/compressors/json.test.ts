import { describe, it, expect } from 'vitest';
import { compressJson } from '../../src/compressors/json.js';

describe('compressJson', () => {
  it('returns empty for empty input', () => {
    const r = compressJson('', 'full');
    expect(r.compressed).toBe('');
    expect(r.ratio).toBe(0);
  });

  it('returns content at off level', () => {
    const content = JSON.stringify({ a: 1, b: 'hello' });
    const r = compressJson(content, 'off');
    expect(r.compressed).toBe(content);
    expect(r.ratio).toBe(0);
  });

  it('truncates long string values', () => {
    const long = 'a'.repeat(100);
    const content = JSON.stringify({ message: long });
    const r = compressJson(content, 'full');
    const parsed = JSON.parse(r.compressed);
    expect(typeof parsed.message).toBe('string');
    expect(parsed.message.length).toBeLessThan(long.length);
    expect(parsed.message).toMatch(/…$/);
  });

  it('deduplicates array items at ultra/wenyan', () => {
    const content = JSON.stringify(['a', 'b', 'a', 'c', 'b']);
    const r = compressJson(content, 'ultra');
    const parsed = JSON.parse(r.compressed);
    expect(parsed).toEqual(['a', 'b', 'c']);
  });

  it('passes through arrays at full level without dedup', () => {
    const content = JSON.stringify(['a', 'b', 'a', 'c', 'b']);
    const r = compressJson(content, 'full');
    const parsed = JSON.parse(r.compressed);
    expect(parsed).toEqual(['a', 'b', 'a', 'c', 'b']);
  });

  it('handles invalid JSON by returning as-is', () => {
    const content = 'not json';
    const r = compressJson(content, 'full');
    expect(r.compressed).toBe(content);
  });

  it('handles nested objects', () => {
    const content = JSON.stringify({ a: { b: { c: 'x'.repeat(60) } } });
    const r = compressJson(content, 'full');
    const parsed = JSON.parse(r.compressed);
    expect(parsed.a.b.c).toMatch(/…$/);
  });

  it('calculates ratio', () => {
    const content = JSON.stringify({ msg: 'x'.repeat(200) });
    const r = compressJson(content, 'full');
    expect(r.ratio).toBeGreaterThan(0);
    expect(r.originalLen).toBe(content.length);
  });
});
