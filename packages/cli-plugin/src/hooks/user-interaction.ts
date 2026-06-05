import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { UserPromptSubmittedPayload } from '../types/hooks.js';
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
      const _payload: UserPromptSubmittedPayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'userPromptSubmitted',
        data: {
          originalPrompt: prompt,
          length: prompt?.length || 0,
        },
      };

      // TODO: Fire event to listeners (cavemem stores observations)
      // TODO: Apply prompt compression/transformation if needed

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
