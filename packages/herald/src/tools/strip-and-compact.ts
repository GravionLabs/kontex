import { compress } from '@gravionlabs/kontex-compress';
import { globalCompressionMode } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMemoryStore } from '../memory/memory-store.js';
import { stripReasoningBlocks } from '../services/reasoning-stripper.js';

export function registerStripAndCompactTool(server: McpServer): void {
  server.registerTool(
    'strip-and-compact',
    {
      title: 'Strip reasoning and compact',
      description:
        'Strip <thinking> blocks from conversation content, apply compression, ' +
        'and store compacted observation in memory store. Call before context compaction to prevent context rot.',
      inputSchema: {
        content: z.string().describe('Conversation content to process'),
        level: z
          .enum(['off', 'lite', 'full', 'ultra', 'wenyan'])
          .optional()
          .describe('Compression level (defaults to current global level)'),
        sessionId: z.string().optional().describe('Optional session ID to associate with the observation'),
      },
    },
    async ({ content, level, sessionId }) => {
      const compressLevel = level || globalCompressionMode.level;

      const { stripped, removedChars, blockCount } = stripReasoningBlocks(content);

      const compressed =
        compressLevel !== 'off'
          ? compress(stripped, compressLevel)
          : { compressed: stripped, originalLen: stripped.length, compressedLen: stripped.length, ratio: 0 };

      const memStore = getMemoryStore();
      if (memStore && sessionId) {
        memStore.storeObservation(sessionId, 'stripAndCompact', 'strip-and-compact', compressed.compressed);
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
