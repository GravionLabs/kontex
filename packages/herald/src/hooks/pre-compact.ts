import { compress } from '@gravionlabs/kontex-compress';
import type { PreCompactPayload } from '@gravionlabs/kontex-types';
import { globalCompressionMode, globalEventBus } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMemoryStore } from '../memory/memory-store.js';
import { stripReasoningBlocks } from '../services/reasoning-stripper.js';
import { getCurrentSessionId } from './session-lifecycle.js';

export function registerPreCompactHook(server: McpServer): void {
  server.registerTool(
    'pre-compact',
    {
      title: 'Pre-compact hook',
      description:
        'Strip reasoning blocks, apply compression, store in memory store. ' +
        'Returns cleaned content for context compaction.',
      inputSchema: {
        content: z.string().describe('Text content to compact (conversation history with reasoning blocks)'),
      },
    },
    async ({ content }) => {
      const sessionId = getCurrentSessionId();

      const { stripped, removedChars, blockCount } = stripReasoningBlocks(content);

      const compressLevel: 'lite' | 'full' | 'ultra' | 'wenyan' =
        globalCompressionMode.level === 'off' ? 'full' : globalCompressionMode.level;
      const compressed = compress(stripped, compressLevel);

      const payload: PreCompactPayload = {
        timestamp: Date.now(),
        sessionId,
        phase: 'preCompact',
        data: {
          content: compressed.compressed,
          originalLength: content.length,
        },
      };

      globalEventBus.emit(payload);

      const store = getMemoryStore();
      if (store) {
        store.storeObservation(sessionId, 'preCompact', 'compact', compressed.compressed);
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
