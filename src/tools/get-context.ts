import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SpecStore } from '../services/spec-store.js';
import { formatToolError, projectSchema, textContent } from '../services/rules.js';
import { WORKFLOW_PHASES } from '../services/spec-types.js';

export function registerGetContextTool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    'get-context',
    {
      title: 'Get context',
      description:
        'Return aggregated project context for a given workflow phase. ' +
        'Loads global rules and conventions plus phase-specific specs from docs/ and specs/. ' +
        'Call this at the start of any task to load relevant conventions before beginning work.',
      inputSchema: {
        project: projectSchema,
        phase: z
          .enum(WORKFLOW_PHASES as [string, ...string[]])
          .describe(
            'Workflow phase: analysis | planning | implementation | testing | verification. ' +
              'Each phase loads a different set of spec directories.',
          ),
      },
    },
    async ({ project, phase }) => {
      try {
        const entries = await store.getContext(project, phase as (typeof WORKFLOW_PHASES)[number]);

        if (entries.length === 0) {
          return {
            content: [
              textContent(
                `No context found for phase "${phase}". ` +
                  `Create specs following the directory convention:\n` +
                  `  specs/architecture/rules.md  (always loaded)\n` +
                  `  docs/conventions.md          (always loaded)\n` +
                  `  specs/phases/${phase}.md     (phase-specific)`,
              ),
            ],
          };
        }

        const projectLabel = project?.trim() || store.defaultProject;
        const sections = entries.map((entry) => `## ${entry.relativePath}\n\n${entry.content.trim()}`);
        const text = `# project: ${projectLabel} | phase: ${phase}\n\n${sections.join('\n\n---\n\n')}`;

        return { content: [textContent(text)] };
      } catch (error) {
        return formatToolError(error, 'Failed to load context.');
      }
    },
  );
}
