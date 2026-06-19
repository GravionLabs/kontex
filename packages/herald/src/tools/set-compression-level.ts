import type { CompressionLevel } from '@gravionlabs/kontex-types';
import { COMPRESSION_LEVELS, globalCompressionMode } from '@gravionlabs/kontex-types';
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

export function registerSetCompressionLevelTool(server: McpServer): void {
  server.registerTool(
    'set-compression-level',
    {
      title: 'Set compression level',
      description: 'Set compression level for context output: off | lite | full | ultra | wenyan',
      inputSchema: {
        level: z
          .enum(COMPRESSION_LEVELS as [string, ...string[]])
          .describe(
            'Compression level: off (none), lite (minimal), full (standard), ultra (aggressive), wenyan (classical)',
          ),
      },
    },
    async ({ level }) => {
      try {
        const cmpLevel = level as CompressionLevel;
        globalCompressionMode.setLevel(cmpLevel);

        const savings: Record<CompressionLevel, string> = {
          off: '0%',
          lite: '~15%',
          full: '~30%',
          ultra: '~45%',
          wenyan: '~45%',
        };

        const summaries: Record<CompressionLevel, string> = {
          off: 'No compression applied.',
          lite: 'Removes pleasantries, hedges, fillers, leaders.',
          full: 'Lite + articles removed.',
          ultra: 'Full + synonym shortening (e.g. implementation → impl).',
          wenyan: 'Ultra + classical Chinese register (future).',
        };

        return {
          content: [
            textContent(
              `## Compression Mode: ${cmpLevel}\n\n` +
                `**Expected savings:** ${savings[cmpLevel]}\n\n` +
                `${summaries[cmpLevel]}\n\n` +
                `Effective for next get-context call.`,
            ),
          ],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to set compression mode.');
      }
    },
  );
}
