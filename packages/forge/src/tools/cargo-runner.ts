import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DevToolsRegistry } from '../services/devtools-registry.js';

const execAsync = promisify(exec);

interface CargoTestResult {
  passed: number;
  failed: number;
  ignored: number;
  measured: number;
  duration: string;
  failures: Array<{ name: string; message: string }>;
}

function parseCargoTestOutput(stdout: string): CargoTestResult {
  const result: CargoTestResult = { passed: 0, failed: 0, ignored: 0, measured: 0, duration: '', failures: [] };

  const summaryMatch = stdout.match(
    /test result:\s+(\S+)\.\s+(\d+)\s+passed;\s*(\d+)\s+failed;\s*(\d+)\s+ignored;\s*(\d+)\s+measured;\s*(\d+)\s+filtered out;\s*finished in\s+([\d.]+s)/i,
  );
  if (summaryMatch) {
    result.passed = parseInt(summaryMatch[2] || '0', 10);
    result.failed = parseInt(summaryMatch[3] || '0', 10);
    result.ignored = parseInt(summaryMatch[4] || '0', 10);
    result.measured = parseInt(summaryMatch[5] || '0', 10);
    result.duration = summaryMatch[7] || '';
    return result;
  }

  const altMatch = stdout.match(/test result:\s+(\S+)\.\s+(\d+)\s+passed;\s*(\d+)\s+failed.*?in\s+([\d.]+s)/i);
  if (altMatch) {
    result.passed = parseInt(altMatch[2] || '0', 10);
    result.failed = parseInt(altMatch[3] || '0', 10);
    result.duration = altMatch[4] || '';
  }

  const failRe = /failures:\n\n----\s*(\S+)\s+----\n([\s\S]*?)(?=\n\nfailures:|$)/g;
  let failMatch = failRe.exec(stdout);
  while (failMatch !== null) {
    result.failures.push({
      name: failMatch[1].trim(),
      message: failMatch[2].trim().slice(0, 500),
    });
    failMatch = failRe.exec(stdout);
  }

  return result;
}

export function registerCargoRunnerTool(server: McpServer, registry: DevToolsRegistry): void {
  server.registerTool(
    'run-cargo-test',
    {
      title: 'Run cargo test',
      description: 'Run cargo test with parsed structured output (pass/fail/ignored counts, named failures)',
      inputSchema: {
        args: z.string().optional().default('').describe('Additional cargo test arguments (e.g. -- --nocapture)'),
        workingDir: z
          .string()
          .optional()
          .describe('Working directory containing Cargo.toml (defaults to DEVTOOLS_WORKING_DIR)'),
      },
    },
    async ({ args, workingDir }) => {
      const config = registry.getConfig();
      const cwd = workingDir || config.workingDir || process.cwd();
      const command = `cargo test ${args} 2>&1`;

      try {
        const execOpts: Record<string, unknown> = { timeout: config.timeoutMs, cwd };
        const { stdout } = await execAsync(command, execOpts);

        const parsed = parseCargoTestOutput(stdout);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: stdout.slice(0, 2000) }, null, 2) }],
          isError: parsed.failed > 0,
        };
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; code?: number };
        const combined = (err.stdout || '') + (err.stderr || '');
        const parsed = parseCargoTestOutput(combined);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...parsed, raw: combined.slice(0, 2000) }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}
