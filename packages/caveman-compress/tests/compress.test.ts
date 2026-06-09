import { describe, expect, it } from 'vitest';
import { compressToCaveman } from '../src/compress.js';
import { tokenize, detokenize } from '../src/tokenize.js';

describe('compressToCaveman', () => {
  describe('happy path', () => {
    it('removes fillers at default level', () => {
      const input = 'This is just really basically simple.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bjust\b|\breally\b|\bbasically\b/i);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('removes pleasantries', () => {
      const input = 'Please thank you for your help. Sure!';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bplease\b|\bthank you\b|\bsure\b/i);
    });

    it('removes hedges', () => {
      const input = 'Perhaps this might work. Maybe you could potentially do this.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bperhaps\b|\bmight\b|\bmaybe\b|\bcould potentially\b/i);
    });

    it('removes leaders', () => {
      const input = `I'll help.\nI will do it.\nLet me explain.`;
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/I'll/);
      expect(result.compressed).not.toMatch(/I will/);
      expect(result.compressed).not.toMatch(/Let me/);
    });

    it('removes articles at full level', () => {
      const input = 'The quick brown fox jumps over a lazy dog.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bthe\b/i);
      expect(result.compressed).not.toMatch(/\ba\b/i);
    });

    it('shortens abbreviations at ultra level', () => {
      const input = 'Database implementation requires authentication configuration.';
      const result = compressToCaveman(input, 'ultra');
      expect(result.compressed).toContain('DB');
      expect(result.compressed).toContain('impl');
      expect(result.compressed).toContain('auth');
      expect(result.compressed).toContain('config');
    });

    it('wenyan level behaves like ultra', () => {
      const input = 'Database implementation requires authentication.';
      const result = compressToCaveman(input, 'wenyan');
      expect(result.compressed).toContain('DB');
      expect(result.compressed).toContain('impl');
      expect(result.compressed).toContain('auth');
    });

    it('calculates compression ratio correctly', () => {
      const input = 'Please thank you really just basically simply very quite essentially.';
      const result = compressToCaveman(input);
      expect(result.originalLen).toBe(input.length);
      expect(result.compressedLen).toBeLessThan(result.originalLen);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.ratio).toBeLessThanOrEqual(100);
    });

    it('defaults to full level when omitted', () => {
      const input = 'The quick brown fox. Please thank you.';
      const withDefault = compressToCaveman(input);
      const withFull = compressToCaveman(input, 'full');
      expect(withDefault.compressed).toBe(withFull.compressed);
    });
  });

  describe('level variants', () => {
    it('level off returns content unchanged', () => {
      const input = 'Please just try this.';
      const result = compressToCaveman(input, 'off');
      expect(result.compressed).toBe(input);
      expect(result.ratio).toBe(0);
    });

    it('level off bypasses max length check', () => {
      const big = 'x'.repeat(60000);
      const result = compressToCaveman(big, 'off');
      expect(result.compressed).toBe(big);
    });

    it('level lite removes fillers but keeps articles', () => {
      const input = 'The quick brown fox. Please thank you.';
      const result = compressToCaveman(input, 'lite');
      expect(result.compressed).not.toContain('please');
      expect(result.compressed).not.toContain('thank');
      expect(result.compressed).toContain('The');
    });

    it('level lite does not use abbreviations', () => {
      const input = 'Database implementation.';
      const result = compressToCaveman(input, 'lite');
      expect(result.compressed).toContain('Database');
      expect(result.compressed).toContain('implementation');
    });

    it('level full removes articles', () => {
      const input = 'The quick brown fox jumps over a lazy dog.';
      const result = compressToCaveman(input, 'full');
      expect(result.compressed).not.toMatch(/\bthe\b/i);
      expect(result.compressed).not.toMatch(/\ba\b/i);
    });

    it('level full does not use abbreviations', () => {
      const input = 'Database implementation.';
      const result = compressToCaveman(input, 'full');
      expect(result.compressed).not.toContain('DB');
    });
  });

  describe('preserved content', () => {
    it('preserves fenced code blocks', () => {
      const input = `Please fix this.\n\`\`\`\njust really basically simple code\n\`\`\`\nThanks.`;
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('just really basically simple code');
      expect(result.compressed).toMatch(/```/);
    });

    it('preserves inline code', () => {
      const input = 'Please use `just.really.basically` function.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('`just.really.basically`');
    });

    it('preserves URLs', () => {
      const input = 'Please visit https://example.com/path.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('https://example.com/path');
    });

    it('preserves function calls', () => {
      const input = 'Please call myFunction(arg1, arg2) now.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('myFunction(arg1, arg2)');
    });

    it('preserves version numbers', () => {
      const input = 'Please upgrade to version 1.2.3.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('1.2.3');
    });

    it('preserves CONST_CASE identifiers', () => {
      const input = 'Use MAX_LENGTH constant.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('MAX_LENGTH');
    });

    it('preserves paths', () => {
      const input = 'Check src/services/compression.ts.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('src/services/compression.ts');
    });

    it('preserves frontmatter', () => {
      const input = `---\ntitle: Example\n---\nPlease thank you.`;
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('---\ntitle: Example\n---');
      expect(result.compressed).not.toMatch(/\bplease\b|\bthank\b/i);
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = compressToCaveman('');
      expect(result.compressed).toBe('');
      expect(result.originalLen).toBe(0);
      expect(result.compressedLen).toBe(0);
      expect(result.ratio).toBe(0);
    });

    it('handles whitespace-only input', () => {
      const result = compressToCaveman('   \n\n  ');
      expect(result.compressed).toBe('');
      expect(result.originalLen).toBe(0);
      expect(result.ratio).toBe(0);
    });

    it('handles input with no removable words', () => {
      const input = 'DB auth config req res fn app.';
      const result = compressToCaveman(input);
      expect(result.compressed.length).toBeGreaterThan(0);
    });

    it('collapses multiple newlines', () => {
      const input = 'Line 1\n\n\n\nLine 2';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toContain('\n\n\n');
    });

    it('handles malformedfrontmatter (no closing marker) as body', () => {
      const input = `---\nno closing marker\nThis is content`;
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('---');
      expect(result.compressed).toContain('no closing marker');
    });

    it('handles content without frontmatter', () => {
      const input = 'Just a normal sentence without anything special.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toContain('---');
    });
  });

  describe('error cases', () => {
    it('throws on oversized input', () => {
      const bigInput = 'x'.repeat(50001);
      expect(() => compressToCaveman(bigInput)).toThrow('Input exceeds maximum length');
    });
  });

  describe('mixed content', () => {
    it('handles content with multiple preserved types and compression', () => {
      const input = 'Please visit https://example.com. Use `just_really` constant CONST_VAR.';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('https://example.com');
      expect(result.compressed).toContain('`just_really`');
      expect(result.compressed).toContain('CONST_VAR');
      expect(result.compressed).not.toMatch(/\bplease\b/i);
    });
  });
});

describe('tokenize', () => {
  it('returns prose segment for plain text', () => {
    const input = 'hello world';
    const segments = tokenize(input);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('prose');
    expect(segments[0].preserved).toBe(false);
    expect(segments[0].text).toBe('hello world');
  });

  it('identifies fenced code blocks', () => {
    const input = 'text\n```\ncode\n```\nmore';
    const segments = tokenize(input);
    const fence = segments.find((s) => s.kind === 'fence');
    expect(fence).toBeDefined();
    expect(fence!.preserved).toBe(true);
    expect(fence!.text).toContain('code');
  });

  it('identifies inline code', () => {
    const input = 'use `code` here';
    const segments = tokenize(input);
    const inline = segments.find((s) => s.kind === 'inline-code');
    expect(inline).toBeDefined();
    expect(inline!.text).toBe('`code`');
  });

  it('identifies URLs', () => {
    const input = 'see https://example.com';
    const segments = tokenize(input);
    const url = segments.find((s) => s.kind === 'url');
    expect(url).toBeDefined();
    expect(url!.text).toBe('https://example.com');
  });

  it('identifies headings', () => {
    const input = '# Title\ncontent';
    const segments = tokenize(input);
    const heading = segments.find((s) => s.kind === 'heading');
    expect(heading).toBeDefined();
    expect(heading!.text).toBe('# Title');
  });

  it('identifies CONST_CASE', () => {
    const input = 'use MAX_LIMIT';
    const segments = tokenize(input);
    const cc = segments.find((s) => s.kind === 'const-case');
    expect(cc).toBeDefined();
    expect(cc!.text).toBe('MAX_LIMIT');
  });

  it('identifies version numbers', () => {
    const input = 'v1.2.3-beta';
    const segments = tokenize(input);
    const ver = segments.find((s) => s.kind === 'version');
    expect(ver).toBeDefined();
  });

  it('identifies dates', () => {
    const input = 'date 2024-01-15';
    const segments = tokenize(input);
    const date = segments.find((s) => s.kind === 'date');
    expect(date).toBeDefined();
  });

  it('identifies numbers', () => {
    const input = 'count 42';
    const segments = tokenize(input);
    const num = segments.find((s) => s.kind === 'number');
    expect(num).toBeDefined();
    expect(num!.text).toBe('42');
  });
});

describe('detokenize', () => {
  it('reconstructs original from tokenize output', () => {
    const input = 'Hello `code` world. Visit https://example.com. Use MAX_LIMIT.';
    const segments = tokenize(input);
    const reconstructed = detokenize(segments);
    expect(reconstructed).toBe(input);
  });

    it('handles empty input', () => {
      const segments = tokenize('');
      expect(segments).toHaveLength(0);
      expect(detokenize(segments)).toBe('');
    });
});
