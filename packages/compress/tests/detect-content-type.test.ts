import { describe, expect, it } from 'vitest';
import { detectContentType } from '../src/detect-content-type.js';

describe('detectContentType', () => {
  it('detects JSON object', () => {
    expect(detectContentType('{"a": 1, "b": "hello"}')).toBe('json');
  });

  it('detects JSON array', () => {
    expect(detectContentType('[1, 2, 3]')).toBe('json');
  });

  it('detects nested JSON', () => {
    expect(detectContentType('{"a": {"b": [1, 2]}}')).toBe('json');
  });

  it('invalid JSON returns text', () => {
    expect(detectContentType('{invalid}')).toBe('text');
  });

  it('detects unified diff', () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,6 @@
-const x = 1;
+const x = 2;
 context line`;
    expect(detectContentType(diff)).toBe('diff');
  });

  it('non-diff text returns other type', () => {
    expect(detectContentType('Just some text about diff tool')).toBe('text');
  });

  it('detects log content', () => {
    const log = `[2024-01-15] [INFO] Starting service
[2024-01-15] [ERROR] Connection refused
[2024-01-15] [WARN] Retrying in 5s`;
    expect(detectContentType(log)).toBe('log');
  });

  it('detects log with ERROR keyword', () => {
    const log = `ERROR: something failed
FATAL: system crash
WARNING: disk full`;
    expect(detectContentType(log)).toBe('log');
  });

  it('plain text without log patterns returns text', () => {
    expect(detectContentType('Hello world this is normal prose.')).toBe('text');
  });

  it('detects markdown with headings', () => {
    const md = `# Title
Some content here.
## Subtitle
More content.`;
    expect(detectContentType(md)).toBe('markdown');
  });

  it('detects markdown with frontmatter', () => {
    const md = `---
title: Test
---
# Heading`;
    expect(detectContentType(md)).toBe('markdown');
  });

  it('empty string returns text', () => {
    expect(detectContentType('')).toBe('text');
  });

  it('whitespace-only returns text', () => {
    expect(detectContentType('   \n  ')).toBe('text');
  });
});
