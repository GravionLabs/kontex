import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DevToolsRegistry } from '../services/devtools-registry.js';

const execAsync = promisify(exec);

interface PytestResult {
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  duration: string;
  failures: Array<{ name: string; message: string }>;
}

function parsePytestOutput(stdout: string, stderr: string): PytestResult {
  const combined = `${stdout}\n${stderr}`;
  const result: PytestResult = { passed: 0, failed: 0, skipped: 0, errors: 0, duration: '', failures: [] };

  const summaryMatch = combined.match(
    /(\d+) passed,?\s*(\d+)?\s*failed,?\s*(\d+)?\s*(?:skipped|warnings)?,?\s*(\d+)?\s*(?:errors)?.*?in\s+([\d.]+[sm])/i,
  );
  if (summaryMatch) {
    result.passed = parseInt(summaryMatch[1] || '0', 10);
    result.failed = parseInt(summaryMatch[2] || '0', 10);
    result.skipped = parseInt(summaryMatch[3] || '0', 10);
    result.errors = parseInt(summaryMatch[4] || '0', 10);
    result.duration = summaryMatch[5] || '';
  }

  const failRe = /FAILED\s+(\S+)/g;
  let failMatch = failRe.exec(combined);
  while (failMatch !== null) {
    result.failures.push({ name: failMatch[1], message: '' });
    failMatch = failRe.exec(combined);
  }

  const errorBlockRe = /(?:_ (\S+) _)?Error\n={3,}\n([\s\S]*?)(?=\n_{3,}|$)/g;
  let errorMatch = errorBlockRe.exec(combined);
  while (errorMatch !== null) {
    const name = errorMatch[1] || 'unknown';
    const existing = result.failures.find((f) => f.name === name);
    if (existing) {
      existing.message = errorMatch[2].trim();
    }
    errorMatch = errorBlockRe.exec(combined);
  }

  return result;
}

export function registerPytestRunnerTool(server: McpServer, registry: DevToolsRegistry): void {
  server.registerTool(
    'run-pytest',
    {
      title: 'Run pytest',
      description: 'Run pytest with parsed structured output (pass/fail/skip counts, named failures)',
      inputSchema: {
        args: z.string().optional().default('').describe('Additional pytest arguments (e.g. -xvs tests/)'),
        workingDir: z.string().optional().describe('Working directory (defaults to DEVTOOLS_WORKING_DIR)'),
      },
    },
    async ({ args, workingDir }) => {
      const config = registry.getConfig();
      const cwd = workingDir || config.workingDir || process.cwd();
      const command = `pytest ${args} --tb=short 2>&1`;

      try {
        const execOpts: Record<string, unknown> = { timeout: config.timeoutMs, cwd };
        const { stdout, stderr } = await execAsync(command, execOpts);

        const parsed = parsePytestOutput(stdout, stderr);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: stdout.slice(0, 2000) }, null, 2) }],
          isError: parsed.failed > 0 || parsed.errors > 0,
        };
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; code?: number };
        const combined = (err.stdout || '') + (err.stderr || '');
        const parsed = parsePytestOutput(combined, '');
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: combined.slice(0, 2000) }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}
