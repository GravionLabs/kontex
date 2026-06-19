import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs, run } from '../src/compress-cli.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'kontex-compress-cli-test-'));
}

describe('parseArgs', () => {
  it('defaults level to full with no args', () => {
    const result = parseArgs([]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.level).toBe('full');
      expect(result.args.file).toBeUndefined();
      expect(result.args.help).toBe(false);
      expect(result.args.version).toBe(false);
    }
  });

  it('parses --help flag', () => {
    const result = parseArgs(['--help']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.help).toBe(true);
    }
  });

  it('parses -h flag', () => {
    const result = parseArgs(['-h']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.help).toBe(true);
    }
  });

  it('parses --version flag', () => {
    const result = parseArgs(['--version']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.version).toBe(true);
    }
  });

  it('parses --level lite', () => {
    const result = parseArgs(['--level', 'lite']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.level).toBe('lite');
    }
  });

  it('parses -l ultra', () => {
    const result = parseArgs(['-l', 'ultra']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.level).toBe('ultra');
    }
  });

  it('errors on --level without value', () => {
    const result = parseArgs(['--level']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/requires a value/);
    }
  });

  it('errors on invalid --level value', () => {
    const result = parseArgs(['--level', 'invalid']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Invalid level/);
    }
  });

  it('parses --output file.md', () => {
    const result = parseArgs(['--output', 'out.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.output).toBe('out.md');
    }
  });

  it('parses -o out.md', () => {
    const result = parseArgs(['-o', 'out.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.output).toBe('out.md');
    }
  });

  it('errors on --output without value', () => {
    const result = parseArgs(['--output']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/requires a value/);
    }
  });

  it('parses positional file argument', () => {
    const result = parseArgs(['input.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.file).toBe('input.md');
    }
  });

  it('takes first positional as file, ignores extras', () => {
    const result = parseArgs(['a.md', 'b.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.file).toBe('a.md');
    }
  });

  it('errors on unknown option', () => {
    const result = parseArgs(['--unknown']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Unknown option/);
    }
  });

  it('combines --level with file arg', () => {
    const result = parseArgs(['--level', 'ultra', 'doc.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.level).toBe('ultra');
      expect(result.args.file).toBe('doc.md');
    }
  });

  it('combines --level --output and file', () => {
    const result = parseArgs(['--level', 'lite', '-o', 'out.md', 'in.md']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.level).toBe('lite');
      expect(result.args.output).toBe('out.md');
      expect(result.args.file).toBe('in.md');
    }
  });
});

describe('run', () => {
  it('reads file and compresses at default level', async () => {
    const dir = tmpDir();
    const input = join(dir, 'input.md');
    writeFileSync(input, 'Please just try this thing.', 'utf-8');

    const output = await run({ help: false, version: false, level: 'full', file: input });
    expect(output).not.toMatch(/please/i);
    expect(output).not.toMatch(/just/i);
    expect(output.length).toBeGreaterThan(0);
  });

  it('compresses at specified level', async () => {
    const dir = tmpDir();
    const input = join(dir, 'input.md');
    writeFileSync(input, 'The quick brown fox. Database implementation.', 'utf-8');

    const output = await run({ help: false, version: false, level: 'ultra', file: input });
    expect(output).toContain('DB');
    expect(output).toContain('impl');
    expect(output).not.toMatch(/\bthe\b/i);
  });

  it('level off returns content unchanged', async () => {
    const dir = tmpDir();
    const input = join(dir, 'input.md');
    const content = 'Please just try this.';
    writeFileSync(input, content, 'utf-8');

    const output = await run({ help: false, version: false, level: 'off', file: input });
    expect(output).toBe(content);
  });

  it('handles empty file', async () => {
    const dir = tmpDir();
    const input = join(dir, 'empty.md');
    writeFileSync(input, '', 'utf-8');

    const output = await run({ help: false, version: false, level: 'full', file: input });
    expect(output).toBe('');
  });

  it('handles file with whitespace only', async () => {
    const dir = tmpDir();
    const input = join(dir, 'ws.md');
    writeFileSync(input, '   \n\n  ', 'utf-8');

    const output = await run({ help: false, version: false, level: 'full', file: input });
    expect(output).toBe('');
  });

  it('handles no file (no input)', async () => {
    const output = await run({ help: false, version: false, level: 'full' });
    expect(output).toBe('');
  });

  it('throws on oversized input', async () => {
    const dir = tmpDir();
    const input = join(dir, 'big.md');
    writeFileSync(input, 'x'.repeat(50001), 'utf-8');

    await expect(run({ help: false, version: false, level: 'full', file: input })).rejects.toThrow(
      'Input exceeds maximum length',
    );
  });

  it('throws on nonexistent file', async () => {
    await expect(run({ help: false, version: false, level: 'full', file: '/nonexistent/path.md' })).rejects.toThrow(
      'Cannot read file',
    );
  });
});
