import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SessionEndPayload, SessionStartPayload } from '../types/hooks.js';
import { createSessionId } from '../types/hooks.js';

let currentSessionId = createSessionId();

export function registerSessionLifecycleHooks(server: McpServer): void {
  server.registerTool(
    'session-lifecycle',
    {
      title: 'Session lifecycle management',
      description: 'Manage session lifecycle events (start, end)',
      inputSchema: {
        event: z.enum(['start', 'end']).describe('Session event type'),
        metadata: z.record(z.unknown()).optional().describe('Optional event metadata'),
      },
    },
    async ({ event, metadata }) => {
      if (event === 'start') {
        const _payload: SessionStartPayload = {
          timestamp: Date.now(),
          sessionId: currentSessionId,
          phase: 'sessionStart',
          data: {
            projectPath: process.cwd(),
            ...metadata,
          },
        };
        // TODO: Fire event to listeners (cavemem integration)
        return {
          content: [
            {
              type: 'text',
              text: `Session started: ${currentSessionId}`,
            },
          ],
        };
      }

      if (event === 'end') {
        const _payload: SessionEndPayload = {
          timestamp: Date.now(),
          sessionId: currentSessionId,
          phase: 'sessionEnd',
          data: {
            exitCode: 0,
            ...metadata,
          },
        };
        // TODO: Fire event to listeners, flush memory to cavemem
        return {
          content: [
            {
              type: 'text',
              text: `Session ended: ${currentSessionId}`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text', text: 'Unknown session event' }],
        isError: true,
      };
    },
  );
}

export function getCurrentSessionId(): string {
  return currentSessionId;
}

export function resetSessionId(): void {
  currentSessionId = createSessionId();
}
