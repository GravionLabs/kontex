import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SpecStore } from '../services/spec-store.js';
import { formatToolError, projectSchema, specPathSchema, textContent } from '../services/rules.js';

export function registerLoadSpecTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'load-spec',
    {
      title: 'Load spec',
      description: 'Load a single file from docs/ or specs/.',
      inputSchema: {
        project: projectSchema,
        path: specPathSchema.describe('Relative file path under docs/ or specs/'),
      },
    },
    async ({ project, path }) => {
      try {
        const spec = await store.loadSpec(project, path);
        const projectLabel = project?.trim() || store.defaultProject;
        return {
          content: [
            {
              ...textContent(`# project: ${projectLabel}\n# ${spec.relativePath}\n\n${spec.content}`),
            },
          ],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to load spec.');
      }
    },
  );
}
