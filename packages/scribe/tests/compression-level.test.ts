import { describe, expect, it } from 'vitest';
import { compressArtifact } from '../src/services/compression.js';

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
