import { describe, expect, it } from 'vitest';
import { SpecServerError, ensureAllowedSpecRelativePath, ensureAllowedRootPath } from '../src/services/rules.js';

describe('SpecServerError', () => {
  it('stores message', () => {
    const error = new SpecServerError('test message');
    expect(error.message).toBe('test message');
  });

  it('is instance of Error', () => {
    const error = new SpecServerError('test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ensureAllowedSpecRelativePath', () => {
  it('allows docs/ prefix', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/readme.md')).not.toThrow();
  });

  it('allows specs/ prefix', () => {
    expect(() => ensureAllowedSpecRelativePath('specs/api.yaml')).not.toThrow();
  });

  it('allows nested paths under docs/', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/subdir/file.md')).not.toThrow();
  });

  it('rejects paths without docs/ or specs/ prefix', () => {
    expect(() => ensureAllowedSpecRelativePath('src/index.ts')).toThrow();
  });

  it('rejects paths with parent traversal', () => {
    expect(() => ensureAllowedSpecRelativePath('../secret.txt')).toThrow();
  });

  it('rejects empty path', () => {
    expect(() => ensureAllowedSpecRelativePath('')).toThrow();
  });

  it('rejects paths with disallowed extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.txt')).toThrow();
  });

  it('allows .md extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.md')).not.toThrow();
  });

  it('allows .yaml extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.yaml')).not.toThrow();
  });

  it('allows .yml extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.yml')).not.toThrow();
  });

  it('allows .json extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.json')).not.toThrow();
  });

  it('allows .markdown extension', () => {
    expect(() => ensureAllowedSpecRelativePath('docs/file.markdown')).not.toThrow();
  });
});

describe('ensureAllowedRootPath', () => {
  it('resolves valid path within root', () => {
    const result = ensureAllowedRootPath('/root', 'docs/file.md');
    expect(result).toBe('/root/docs/file.md');
  });

  it('rejects path that escapes root', () => {
    expect(() => ensureAllowedRootPath('/root', '../escape.md')).toThrow();
  });
});
