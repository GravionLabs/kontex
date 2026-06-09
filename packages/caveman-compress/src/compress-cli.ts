import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressToCaveman } from './compress.js';
import type { CavemanLevel } from './types.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = require('../package.json');

const USAGE = `caveman-compress [options] [file]

Compress text using caveman-style rules.

Options:
  -l, --level <level>  Compression level: off | lite | full | ultra | wenyan  [default: full]
  -o, --output <file>  Write to file instead of stdout
  -h, --help           Show help
  --version            Show version

If no file argument, reads from stdin (pipe mode).`;

export interface ParsedArgs {
  help: boolean;
  version: boolean;
  level: CavemanLevel;
  output?: string;
  file?: string;
}

type ParseResult = { ok: true; args: ParsedArgs } | { ok: false; error: string; exitCode: number };

export function parseArgs(argv: string[]): ParseResult {
  const args: ParsedArgs = { help: false, version: false, level: 'full' };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      return { ok: true, args };
    }

    if (arg === '--version') {
      args.version = true;
      return { ok: true, args };
    }

    if (arg === '--level' || arg === '-l') {
      const val = argv[++i];
      if (!val) return { ok: false, error: '--level requires a value.', exitCode: 1 };
      const valid: CavemanLevel[] = ['off', 'lite', 'full', 'ultra', 'wenyan'];
      if (!valid.includes(val as CavemanLevel)) {
        return { ok: false, error: `Invalid level "${val}". Valid: ${valid.join(' | ')}`, exitCode: 1 };
      }
      args.level = val as CavemanLevel;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const val = argv[++i];
      if (!val) return { ok: false, error: '--output requires a value.', exitCode: 1 };
      args.output = val;
      continue;
    }

    if (arg.startsWith('-')) {
      return { ok: false, error: `Unknown option: ${arg}`, exitCode: 1 };
    }

    if (!args.file) {
      args.file = arg;
    }
  }

  return { ok: true, args };
}

export async function run(args: ParsedArgs): Promise<string> {
  if (!args.file) {
    return '';
  }

  let content: string;
  try {
    content = readFileSync(args.file, 'utf-8');
  } catch {
    throw new Error(`Cannot read file: ${args.file}`);
  }

  const result = compressToCaveman(content, args.level);
  return result.compressed;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function main(): Promise<void> {
  const result = parseArgs(process.argv.slice(2));

  if (!result.ok) {
    process.stderr.write(`${result.error}\n\n`);
    process.exit(result.exitCode);
  }

  if (result.args.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (result.args.version) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  let output: string;
  try {
    if (result.args.file) {
      output = await run(result.args);
    } else {
      const content = await readStdin();
      const compressed = compressToCaveman(content, result.args.level);
      output = compressed.compressed;
    }
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  if (result.args.output) {
    writeFileSync(result.args.output, output, 'utf-8');
  } else {
    process.stdout.write(output);
  }
}
