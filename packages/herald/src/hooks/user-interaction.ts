import type { UserPromptSubmittedPayload } from '@gravionlabs/kontex-types';
import { globalEventBus } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentSessionId } from './session-lifecycle.js';

export function registerUserInteractionHooks(server: McpServer): void {
  server.registerTool(
    'user-prompt-hook',
    {
      title: 'User prompt hook',
      description: 'Hook fired when user submits a prompt',
      inputSchema: {
        prompt: z.string().describe('The user prompt'),
      },
    },
    async ({ prompt }) => {
      const payload: UserPromptSubmittedPayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'userPromptSubmitted',
        data: {
          originalPrompt: prompt,
          length: prompt?.length || 0,
        },
      };

      globalEventBus.emit(payload);

      return {
        content: [
          {
            type: 'text',
            text: `Prompt received (${payload.data.length} chars)`,
          },
        ],
      };
    },
  );
}
