import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMemoryStore } from '../memory/memory-store.js';

export function registerRecallSessionTool(server: McpServer): void {
  server.registerTool(
    'recall-session',
    {
      title: 'Recall session',
      description:
        'Retrieve compressed observations from memory store — past session summaries, ' +
        'tool outputs, and compacted context. Helps agent recall what happened without full context reload.',
      inputSchema: {
        limit: z.number().min(1).max(100).optional().default(20).describe('Number of observations to recall'),
        sessionId: z.string().optional().describe('Filter by session ID'),
        includeHistory: z.boolean().optional().default(false).describe('Also include session history records'),
      },
    },
    async ({ limit, sessionId, includeHistory }) => {
      const store = getMemoryStore();
      if (!store) {
        return {
          content: [{ type: 'text', text: 'Memory store not initialized.' }],
          isError: true,
        };
      }

      let observations = store.recall(limit);

      if (sessionId) {
        observations = observations.filter((o) => o.sessionId === sessionId);
      }

      const summary = {
        observations: observations.map((o) => ({
          id: (o as { id?: number }).id ?? 0,
          sessionId: o.sessionId,
          phase: o.phase,
          toolName: o.toolName,
          originalLen: o.originalLen,
          compressedLen: o.compressedLen,
          ratio: o.ratio,
          compressedText: o.compressedText.length > 500 ? o.compressedText.slice(0, 500) + '...' : o.compressedText,
          createdAt: o.createdAt,
        })),
        totalSaved: observations.reduce((sum, o) => sum + (o.originalLen - o.compressedLen), 0),
        sessionHistory: includeHistory ? store.getSessionHistory(10) : undefined,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    },
  );
}
