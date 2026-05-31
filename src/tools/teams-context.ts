import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SpecStore } from '../services/spec-store.js';
import { formatToolError, projectSchema, textContent } from '../services/rules.js';

export function registerTeamsContextTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'teams-context',
    {
      title: 'Teams context',
      description: 'Return dynamic support context from docs/ and specs/ team-related guidance.',
      inputSchema: {
        project: projectSchema,
        topic: z.string().optional().describe('Optional topic hint to narrow the context'),
      },
    },
    async ({ project, topic }) => {
      try {
        const context = await store.teamsContext(project, topic);
        if (context.length === 0) {
          return { content: [textContent('No team context found.')] };
        }

        const projectLabel = project?.trim() || store.defaultProject;
        return {
          content: [
            {
              ...textContent(`# project: ${projectLabel}\n\n${context.join('\n\n---\n\n')}`),
            },
          ],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to load teams context.');
      }
    },
  );
}
