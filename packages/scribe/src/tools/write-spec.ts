import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError, projectSchema, specPathSchema, textContent } from '../services/rules.js';
import type { SpecStore } from '../services/spec-store.js';

export function registerWriteSpecTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'write-spec',
    {
      title: 'Write spec',
      description:
        'Create or update a spec file under docs/ or specs/. ' +
        'Validates path, writes content, and reindexes the project. ' +
        'Use to persist decisions, patterns, or architecture notes into the spec library.',
      inputSchema: {
        project: projectSchema,
        path: specPathSchema.describe('Relative path under docs/ or specs/ (e.g. specs/api/orders.md)'),
        content: z.string().min(1).describe('File content to write'),
      },
    },
    async ({ project, path: specPath, content }) => {
      try {
        const result = await store.writeSpec(project, specPath, content);
        return {
          content: [textContent(`Written to ${result.absolutePath}\nversion: ${result.version}`)],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to write spec.');
      }
    },
  );
}
