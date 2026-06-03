import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError, projectSchema, textContent } from '../services/rules.js';
import type { SpecStore } from '../services/spec-store.js';

export function registerListSpecsTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'list-specs',
    {
      title: 'List specs',
      description: 'List all available files from docs/ and specs/.',
      inputSchema: {
        project: projectSchema,
        directory: z.enum(['docs', 'specs']).optional().describe('Optional directory filter'),
      },
    },
    async ({ project, directory }) => {
      try {
        const entries = await store.listSpecs(project, directory);
        if (entries.length === 0) {
          return { content: [textContent('No specs found.')] };
        }

        const projectLabel = project?.trim() || store.defaultProject;
        const text = entries.map((entry) => `- ${entry.relativePath} (${entry.kind}, ${entry.size} bytes)`).join('\n');

        return { content: [textContent(`# project: ${projectLabel}\n\n${text}`)] };
      } catch (error) {
        return formatToolError(error, 'Failed to list specs.');
      }
    },
  );
}
