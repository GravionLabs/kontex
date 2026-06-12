import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DevToolsRegistry } from '../services/devtools-registry.js';

const execAsync = promisify(exec);

export interface BashRunnerResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runBashCommand(command: string, timeout = 30000): Promise<BashRunnerResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout });
    return {
      success: true,
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    return {
      success: false,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.code || 1,
    };
  }
}

export function registerBashRunnerTool(server: McpServer, registry: DevToolsRegistry): void {
  server.registerTool(
    'run-command',
    {
      title: 'Run dev command',
      description: 'Execute a development command (pytest, dotnet, npm, cargo, etc.)',
      inputSchema: {
        command: z.string().describe('The command to execute'),
      },
    },
    async ({ command }) => {
      const config = registry.getConfig();

      if (!registry.isCommandAllowed(command)) {
        return {
          content: [
            {
              type: 'text',
              text: `Command not allowed: ${command}. Allowed: ${Array.from(config.allowedCommands).join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await runBashCommand(command, config.timeoutMs);
        const lines = (result.stdout + result.stderr).split('\n');
        const truncated =
          lines.length > config.maxOutputLines
            ? lines.slice(0, config.maxOutputLines).join('\n') +
              `\n... (${lines.length - config.maxOutputLines} more lines)`
            : result.stdout + result.stderr;

        return {
          content: [
            {
              type: 'text',
              text: `Exit code: ${result.exitCode}\n\n${truncated}`,
            },
          ],
          isError: !result.success,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
