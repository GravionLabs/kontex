import type { SessionEndPayload, SessionStartPayload } from '@kontex/types';
import { createSessionId, globalEventBus } from '@kontex/types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

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
        const payload: SessionStartPayload = {
          timestamp: Date.now(),
          sessionId: currentSessionId,
          phase: 'sessionStart',
          data: {
            projectPath: process.cwd(),
            ...metadata,
          },
        };

        globalEventBus.emit(payload);

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
        const metadataExitCode = (metadata as { exitCode?: number } | undefined)?.exitCode;

        const payload: SessionEndPayload = {
          timestamp: Date.now(),
          sessionId: currentSessionId,
          phase: 'sessionEnd',
          data: {
            exitCode: metadataExitCode ?? 0,
            ...metadata,
          },
        };

        globalEventBus.emit(payload);

        resetSessionId();

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
