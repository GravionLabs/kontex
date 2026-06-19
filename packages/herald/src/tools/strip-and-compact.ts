import { compressToCaveman } from '@gravionlabs/kontex-compress';
import { globalCavemanMode } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCavememStore } from '../memory/cavemem.js';
import { stripReasoningBlocks } from '../services/reasoning-stripper.js';

export function registerStripAndCompactTool(server: McpServer): void {
  server.registerTool(
    'strip-and-compact',
    {
      title: 'Strip reasoning and compact',
      description:
        'Strip <thinking> blocks from conversation content, apply caveman compression, ' +
        'and store compacted observation in cavemem. Call before context compaction to prevent context rot.',
      inputSchema: {
        content: z.string().describe('Conversation content to process'),
        level: z
          .enum(['off', 'lite', 'full', 'ultra', 'wenyan'])
          .optional()
          .describe('Caveman compression level (defaults to current global level)'),
        sessionId: z.string().optional().describe('Optional session ID to associate with the observation'),
      },
    },
    async ({ content, level, sessionId }) => {
      const compressLevel = level || globalCavemanMode.level;

      const { stripped, removedChars, blockCount } = stripReasoningBlocks(content);

      const compressed =
        compressLevel !== 'off'
          ? compressToCaveman(stripped, compressLevel)
          : { compressed: stripped, originalLen: stripped.length, compressedLen: stripped.length, ratio: 0 };

      const cavemem = getCavememStore();
      if (cavemem && sessionId) {
        cavemem.storeObservation(sessionId, 'stripAndCompact', 'strip-and-compact', compressed.compressed);
      }

      const originalTokens = Math.ceil(content.length / 4);
      const compressedTokens = Math.ceil(compressed.compressedLen / 4);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              originalTokens,
              compressedTokens,
              savedTokens: originalTokens - compressedTokens,
              compressionRatio: compressed.ratio,
              reasoningBlocksRemoved: blockCount,
              reasoningCharsRemoved: removedChars,
              compressed: compressed.compressed,
            }),
          },
        ],
      };
    },
  );
}
