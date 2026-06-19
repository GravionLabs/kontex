import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DevToolsRegistry } from '../services/devtools-registry.js';

const execAsync = promisify(exec);

interface NpmTestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
  failures: Array<{ name: string; message: string }>;
}

function parseJestOutput(stdout: string): NpmTestResult {
  const result: NpmTestResult = { passed: 0, failed: 0, skipped: 0, duration: '', failures: [] };

  const summaryMatch = stdout.match(
    /Tests:\s+(\d+)\s+passed,?\s*(\d+)?\s*total,?\s*(\d+)?\s*failed,?\s*(\d+)?\s*skipped.*?in\s+([\d.]+(?:\s*s)?)/i,
  );
  if (summaryMatch) {
    result.passed = parseInt(summaryMatch[1] || '0', 10);
    result.failed = parseInt(summaryMatch[3] || '0', 10);
    result.skipped = parseInt(summaryMatch[4] || '0', 10);
    result.duration = summaryMatch[5]?.trim() || '';
    return result;
  }

  const altMatch = stdout.match(
    /Tests:\s+(\d+)\s+(?:passed|failed),?\s*(\d+)?\s*(?:failed|passed)?.*?in\s+([\d.]+(?:\s*s)?)/i,
  );
  if (altMatch) {
    result.passed = parseInt(altMatch[1] || '0', 10);
    result.duration = altMatch[3]?.trim() || '';
  }

  const failRe = /(?:FAIL|✗|×)\s+(\S+)/g;
  let failMatch = failRe.exec(stdout);
  while (failMatch !== null) {
    result.failed++;
    const msgMatch = stdout.slice(failMatch.index).match(/(?:●\s+[\s\S]*?)(?=\n\s*(?:●|$))/);
    result.failures.push({
      name: failMatch[1],
      message: msgMatch ? msgMatch[0].trim().slice(0, 300) : '',
    });
    failMatch = failRe.exec(stdout);
  }

  return result;
}

function parseVitestOutput(stdout: string): NpmTestResult {
  const result: NpmTestResult = { passed: 0, failed: 0, skipped: 0, duration: '', failures: [] };

  const summaryMatch = stdout.match(/(\d+)\s+(?:passed|pass)/);
  const failMatch = stdout.match(/(\d+)\s+(?:failed|fail)/);
  const skipMatch = stdout.match(/(\d+)\s+(?:skipped|skip)/);

  if (summaryMatch) result.passed = parseInt(summaryMatch[1], 10);
  if (failMatch) result.failed = parseInt(failMatch[1], 10);
  if (skipMatch) result.skipped = parseInt(skipMatch[1], 10);

  const durMatch = stdout.match(/in\s+([\d.]+(?:ms|s|m)?)/i);
  if (durMatch) result.duration = durMatch[1];

  const nameRe = /(?:FAIL|×)\s+([\w/.@-]+)/g;
  let nMatch = nameRe.exec(stdout);
  while (nMatch !== null) {
    result.failures.push({ name: nMatch[1], message: '' });
    nMatch = nameRe.exec(stdout);
  }

  return result;
}

export function registerNpmRunnerTool(server: McpServer, registry: DevToolsRegistry): void {
  server.registerTool(
    'run-npm-test',
    {
      title: 'Run npm/pnpm test',
      description: 'Run npm/pnpm test with parsed structured output. Detects jest/vitest output format.',
      inputSchema: {
        script: z.string().optional().default('test').describe('npm script to run (e.g. test, test:ci)'),
        args: z.string().optional().default('').describe('Additional args after the script name'),
        packageManager: z.enum(['npm', 'pnpm', 'yarn']).optional().default('pnpm').describe('Package manager to use'),
        workingDir: z.string().optional().describe('Working directory (defaults to DEVTOOLS_WORKING_DIR)'),
      },
    },
    async ({ script, args, packageManager, workingDir }) => {
      const config = registry.getConfig();
      const cwd = workingDir || config.workingDir || process.cwd();
      const command = `${packageManager} ${script} ${args} 2>&1`;

      try {
        const execOpts: Record<string, unknown> = { timeout: config.timeoutMs, cwd };
        const { stdout, stderr } = await execAsync(command, execOpts);
        const combined = stdout + stderr;

        const parsed = combined.includes('vitest') ? parseVitestOutput(combined) : parseJestOutput(combined);

        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: stdout.slice(0, 2000) }, null, 2) }],
          isError: parsed.failed > 0,
        };
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; code?: number };
        const combined = (err.stdout || '') + (err.stderr || '');
        const parsed = combined.includes('vitest') ? parseVitestOutput(combined) : parseJestOutput(combined);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: combined.slice(0, 2000) }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}
