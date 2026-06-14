import type { CavemanLevel } from '@gravionlabs/kontex-types';
import { CAVEMAN_LEVELS, globalCavemanMode } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function textContent(text: string) {
  return { type: 'text' as const, text };
}

function formatToolError(error: unknown, fallback: string) {
  return {
    content: [textContent(error instanceof Error ? error.message : fallback)],
    isError: true,
  };
}

export function registerSetCavemanModeTool(server: McpServer): void {
  server.registerTool(
    'set-caveman-mode',
    {
      title: 'Set caveman mode',
      description: 'Set compression level for context output: off | lite | full | ultra | wenyan',
      inputSchema: {
        level: z
          .enum(CAVEMAN_LEVELS as [string, ...string[]])
          .describe(
            'Compression level: off (none), lite (minimal), full (standard), ultra (aggressive), wenyan (classical)',
          ),
      },
    },
    async ({ level }) => {
      try {
        const cavemanLevel = level as CavemanLevel;
        globalCavemanMode.setLevel(cavemanLevel);

        const savings: Record<CavemanLevel, string> = {
          off: '0%',
          lite: '~15%',
          full: '~30%',
          ultra: '~45%',
          wenyan: '~45%',
        };

        const summaries: Record<CavemanLevel, string> = {
          off: 'No compression applied.',
          lite: 'Removes pleasantries, hedges, fillers, leaders.',
          full: 'Lite + articles removed.',
          ultra: 'Full + synonym shortening (e.g. implementation → impl).',
          wenyan: 'Ultra + classical Chinese register (future).',
        };

        return {
          content: [
            textContent(
              `## Caveman Mode: ${cavemanLevel}\n\n` +
                `**Expected savings:** ${savings[cavemanLevel]}\n\n` +
                `${summaries[cavemanLevel]}\n\n` +
                `Effective for next get-context call.`,
            ),
          ],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to set caveman mode.');
      }
    },
  );
}
