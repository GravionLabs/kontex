import type { PreCompactPayload } from '@gravionlabs/kontex-types';
import { globalEventBus } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentSessionId } from './session-lifecycle.js';

export function registerPreCompactHook(server: McpServer): void {
  server.registerTool(
    'pre-compact',
    {
      title: 'Pre-compact hook',
      description: 'Hook fired before context compaction to apply caveman compression',
      inputSchema: {
        content: z.string().describe('Text content to compact'),
      },
    },
    async ({ content }) => {
      const payload: PreCompactPayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'preCompact',
        data: {
          content,
          originalLength: content.length,
        },
      };

      globalEventBus.emit(payload);

      const tokens = Math.ceil(content.length / 4);

      return {
        content: [
          {
            type: 'text',
            text: `Text to compact: ${tokens}t`,
          },
        ],
      };
    },
  );
}
