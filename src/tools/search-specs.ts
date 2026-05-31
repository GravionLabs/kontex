import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SpecStore } from '../services/spec-store.js';
import { formatToolError, projectSchema, searchQuerySchema, textContent } from '../services/rules.js';

export function registerSearchSpecsTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'search-specs',
    {
      title: 'Search specs',
      description: 'Search Markdown and YAML files in docs/ and specs/ for matching content.',
      inputSchema: {
        project: projectSchema,
        query: searchQuerySchema,
        limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of results'),
      },
    },
    async ({ project, query, limit }) => {
      try {
        const results = await store.searchSpecs(project, query, limit);
        if (results.length === 0) {
          return { content: [textContent('No matches found.')] };
        }

        const projectLabel = project?.trim() || store.defaultProject;
        const text = results
          .map((result) => `- ${result.relativePath}:${result.lineNumber}\n  ${result.excerpt}`)
          .join('\n');

        return { content: [textContent(`# project: ${projectLabel}\n\n${text}`)] };
      } catch (error) {
        return formatToolError(error, 'Failed to search specs.');
      }
    },
  );
}
