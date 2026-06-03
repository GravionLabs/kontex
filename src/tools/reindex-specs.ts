import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatToolError, projectSchema, textContent } from '../services/rules.js';
import type { SpecStore } from '../services/spec-store.js';

export function registerReindexSpecsTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'reindex-specs',
    {
      title: 'Reindex specs',
      description: 'Refresh SQLite index for one or all configured projects.',
      inputSchema: {
        project: projectSchema,
      },
    },
    async ({ project }) => {
      try {
        const results = await store.reindex(project);
        const text = results
          .map(
            (result) =>
              `- ${result.project}: indexed=${result.indexed}, updated=${result.updated}, deleted=${result.deleted}, skipped=${result.skipped}`,
          )
          .join('\n');

        return {
          content: [textContent(text)],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to reindex specs.');
      }
    },
  );
}
