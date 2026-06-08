import type { ErrorOccurredPayload } from '@kontex/types';
import { globalEventBus } from '@kontex/types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentSessionId } from './session-lifecycle.js';

export function registerErrorHandlingHooks(server: McpServer): void {
  server.registerTool(
    'error-occurred',
    {
      title: 'Error occurred hook',
      description: 'Hook fired when an error occurs in the session',
      inputSchema: {
        errorType: z.string().describe('Type of error'),
        message: z.string().describe('Error message'),
        stack: z.string().optional().describe('Stack trace (optional)'),
      },
    },
    async ({ errorType, message, stack }) => {
      const payload: ErrorOccurredPayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'errorOccurred',
        data: {
          errorType,
          message,
          stack,
        },
      };

      globalEventBus.emit(payload);

      return {
        content: [
          {
            type: 'text',
            text: `Error handled: ${errorType} - ${message}`,
          },
        ],
      };
    },
  );
}
