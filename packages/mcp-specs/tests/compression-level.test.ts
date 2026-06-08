import { describe, expect, it } from 'vitest';
import { compressToCaveman, compressArtifact } from '../src/services/compression.js';

describe('compressToCaveman with level param', () => {
  it('level off returns content unchanged', () => {
    const input = 'Please just try this.';
    const result = compressToCaveman(input, 'off');
    expect(result.compressed).toBe(input);
    expect(result.ratio).toBe(0);
    expect(result.originalLen).toBe(result.compressedLen);
  });

  it('level off bypasses max length check', () => {
    const big = 'x'.repeat(60000);
    const result = compressToCaveman(big, 'off');
    expect(result.compressed).toBe(big);
  });

  it('level lite removes pleasantries but keeps articles', () => {
    const input = 'The quick brown fox. Please thank you.';
    const result = compressToCaveman(input, 'lite');
    expect(result.compressed).not.toContain('please');
    expect(result.compressed).not.toContain('thank');
    expect(result.compressed).toContain('The');
  });

  it('level lite removes fillers', () => {
    const input = 'This is really just basically simple.';
    const result = compressToCaveman(input, 'lite');
    expect(result.compressed).not.toContain('really');
    expect(result.compressed).not.toContain('basically');
  });

  it('level full removes articles', () => {
    const input = 'The quick brown fox jumps over a lazy dog.';
    const result = compressToCaveman(input, 'full');
    expect(result.compressed).not.toMatch(/\bthe\b/i);
    expect(result.compressed).not.toMatch(/\ba\b/i);
  });

  it('level ultra shortens synonyms', () => {
    const input = 'The database implementation requires authentication configuration.';
    const result = compressToCaveman(input, 'ultra');
    expect(result.compressed).toContain('DB');
    expect(result.compressed).toContain('impl');
    expect(result.compressed).toContain('auth');
    expect(result.compressed).toContain('config');
  });

  it('level wenyan behaves like ultra', () => {
    const input = 'The database implementation requires authentication configuration.';
    const result = compressToCaveman(input, 'wenyan');
    expect(result.compressed).toContain('DB');
    expect(result.compressed).toContain('impl');
  });

  it('defaults to full when level omitted', () => {
    const input = 'The quick brown fox. Please thank you.';
    const withDefault = compressToCaveman(input);
    const withFull = compressToCaveman(input, 'full');
    expect(withDefault.compressed).toBe(withFull.compressed);
  });
});

describe('compressArtifact with level param', () => {
  it('level off returns content unchanged', () => {
    const input = 'Please just try this configuration.';
    const result = compressArtifact('prompt', input, 'off');
    expect(result.compressed).toBe(input);
    expect(result.ratio).toBe(0);
  });

  it('level lite removes fillers but not synonyms', () => {
    const input = 'Database configuration for the auth layer is just basically simple.';
    const result = compressArtifact('prompt', input, 'lite');
    expect(result.compressed).not.toContain('just');
    expect(result.compressed).not.toContain('basically');
    expect(result.compressed).toContain('Database');
    expect(result.compressed).toContain('configuration');
  });

  it('level full shortens synonyms', () => {
    const input = 'Database implementation requires authentication.';
    const result = compressArtifact('prompt', input, 'full');
    expect(result.compressed).toContain('DB');
    expect(result.compressed).toContain('impl');
    expect(result.compressed).toContain('auth');
  });

  it('kind-specific rules apply at full and above', () => {
    const input = 'You are an AI agent. Please be brief.';
    const result = compressArtifact('agent', input, 'full');
    expect(result.compressed).not.toContain('You are an AI');
    expect(result.compressed).not.toContain('Please');
  });

  it('defaults to full when level omitted', () => {
    const input = 'Database configuration.';
    const withDefault = compressArtifact('prompt', input);
    const withFull = compressArtifact('prompt', input, 'full');
    expect(withDefault.compressed).toBe(withFull.compressed);
  });
});
