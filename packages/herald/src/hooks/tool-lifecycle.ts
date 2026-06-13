import type { PostToolUsePayload, PreToolUsePayload } from '@kontex/types';
import { globalEventBus } from '@kontex/types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentSessionId } from './session-lifecycle.js';

const toolTimings = new Map<string, number>();

export function registerToolLifecycleHooks(server: McpServer): void {
  server.registerTool(
    'tool-pre-use',
    {
      title: 'Tool pre-use hook',
      description: 'Hook fired before tool execution',
      inputSchema: {
        toolName: z.string().describe('Name of the tool being used'),
        args: z.record(z.unknown()).optional().describe('Tool arguments'),
      },
    },
    async ({ toolName, args }) => {
      toolTimings.set(toolName, Date.now());

      const payload: PreToolUsePayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'preToolUse',
        data: {
          toolName,
          args,
        },
      };

      globalEventBus.emit(payload);

      return {
        content: [
          {
            type: 'text',
            text: `Tool pre-use: ${toolName}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'tool-post-use',
    {
      title: 'Tool post-use hook',
      description: 'Hook fired after tool execution',
      inputSchema: {
        toolName: z.string().describe('Name of the tool that was used'),
        success: z.boolean().describe('Whether the tool executed successfully'),
      },
    },
    async ({ toolName, success }) => {
      const startTime = toolTimings.get(toolName) || Date.now();
      const duration = Date.now() - startTime;
      toolTimings.delete(toolName);

      const payload: PostToolUsePayload = {
        timestamp: Date.now(),
        sessionId: getCurrentSessionId(),
        phase: 'postToolUse',
        data: {
          toolName,
          success,
          duration,
        },
      };

      globalEventBus.emit(payload);

      return {
        content: [
          {
            type: 'text',
            text: `Tool post-use: ${toolName} (${duration}ms, success: ${success})`,
          },
        ],
      };
    },
  );
}
