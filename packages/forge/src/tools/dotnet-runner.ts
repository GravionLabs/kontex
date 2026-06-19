import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DevToolsRegistry } from '../services/devtools-registry.js';

const execAsync = promisify(exec);

interface DotnetTestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: string;
  failures: Array<{ name: string; message: string }>;
}

function parseDotnetTestOutput(stdout: string, stderr: string): DotnetTestResult {
  const combined = `${stdout}\n${stderr}`;
  const result: DotnetTestResult = { passed: 0, failed: 0, skipped: 0, total: 0, duration: '', failures: [] };

  const summaryMatch = combined.match(
    /Passed!\s*-\s*Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+).*?Duration:\s*([\s\S]*?)(?=\n|$)/i,
  );
  if (summaryMatch) {
    result.failed = parseInt(summaryMatch[1] || '0', 10);
    result.passed = parseInt(summaryMatch[2] || '0', 10);
    result.skipped = parseInt(summaryMatch[3] || '0', 10);
    result.total = parseInt(summaryMatch[4] || '0', 10);
    result.duration = (summaryMatch[5] || '').trim();
  }

  const failRe = /Failed\s+(\S+)\s*\[[\d.]+\s*(?:ms|s)\]\s*\n\s*Error Message:\s*\n\s*([\s\S]*?)\n\s*Stack Trace:/g;
  let failMatch = failRe.exec(combined);
  while (failMatch !== null) {
    result.failures.push({
      name: failMatch[1].trim(),
      message: failMatch[2].trim().slice(0, 500),
    });
    failMatch = failRe.exec(combined);
  }

  return result;
}

export function registerDotnetRunnerTool(server: McpServer, registry: DevToolsRegistry): void {
  server.registerTool(
    'run-dotnet-test',
    {
      title: 'Run .NET tests',
      description: 'Run dotnet test with parsed structured output (pass/fail/skip counts, named failures)',
      inputSchema: {
        args: z
          .string()
          .optional()
          .default('')
          .describe('Additional dotnet test arguments (e.g. --filter Category=Unit)'),
        workingDir: z.string().optional().describe('Working directory (defaults to DEVTOOLS_WORKING_DIR)'),
      },
    },
    async ({ args, workingDir }) => {
      const config = registry.getConfig();
      const cwd = workingDir || config.workingDir || process.cwd();
      const command = `dotnet test ${args} --no-restore 2>&1`;

      try {
        const execOpts: Record<string, unknown> = { timeout: config.timeoutMs, cwd };
        const { stdout, stderr } = await execAsync(command, execOpts);

        const parsed = parseDotnetTestOutput(stdout, stderr);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: stdout.slice(0, 2000) }, null, 2) }],
          isError: parsed.failed > 0,
        };
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; code?: number };
        const combined = (err.stdout || '') + (err.stderr || '');
        const parsed = parseDotnetTestOutput(combined, '');
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: combined.slice(0, 2000) }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}
