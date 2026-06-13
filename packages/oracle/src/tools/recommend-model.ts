import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { recommendModel } from '../services/issue-scorer.js';

function textContent(text: string) { return { type: 'text' as const, text }; }

function formatToolError(error: unknown, fallback: string) {
  return { content: [textContent(error instanceof Error ? error.message : fallback)], isError: true };
}

export function registerRecommendModelTool(server: McpServer): void {
  server.registerTool(
    'recommend-model',
    {
      title: 'Recommend model',
      description: 'Given a GitHub issue (title, body, labels), recommends the best AI model for implementation.',
      inputSchema: {
        title: z.string().min(1).max(500).describe('Issue title'),
        body: z.string().max(10_000).describe('Issue body content'),
        labels: z.array(z.string()).optional().describe('Issue labels'),
        repoLanguage: z.string().optional().describe('Repository primary language'),
        llmEval: z.boolean().optional().describe('Force LLM evaluation on/off'),
      },
    },
    async ({ title, body, labels, repoLanguage, llmEval }) => {
      try {
        const result = await recommendModel({ title, body, labels, repoLanguage, llmEval });
        return {
          content: [textContent(JSON.stringify(result, null, 2))],
        };
      } catch (error) {
        return formatToolError(error, 'Failed to recommend model.');
      }
    },
  );
}
