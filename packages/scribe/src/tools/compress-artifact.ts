import type { CompressionLevel } from '@gravionlabs/kontex-types';
import { COMPRESSION_LEVELS, globalCompressionMode } from '@gravionlabs/kontex-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { compressArtifact } from '../services/compression.js';
import { formatToolError, textContent } from '../services/rules.js';

export function registerCompressArtifactTool(server: McpServer): void {
  server.registerTool(
    'compress-artifact',
    {
      title: 'Compress artifact',
      description:
        'Compress prompts, skills, or agent descriptions by removing filler words, ' +
        'shortening verbose terms, and applying type-specific rules. Returns compressed text and compression metrics.',
      inputSchema: {
        kind: z.enum(['prompt', 'skill', 'agent']).describe('Artifact type: prompt, skill, or agent description'),
        content: z.string().min(1).max(50000).describe('Text content to compress'),
        level: z
          .enum(COMPRESSION_LEVELS as [string, ...string[]])
          .optional()
          .describe('Compression level (default: current mode or full)'),
      },
    },
    async ({ kind, content, level }) => {
      try {
        const resolvedLevel: CompressionLevel =
          (level as CompressionLevel | undefined) ?? (globalCompressionMode.level !== 'off' ? globalCompressionMode.level : 'full');
        const result = compressArtifact(kind, content, resolvedLevel);

        const summary =
          `## Compression Result\n\n` +
          `**Level:** ${resolvedLevel}\n` +
          `**Original:** ${result.originalLen} chars\n` +
          `**Compressed:** ${result.compressedLen} chars\n` +
          `**Reduction:** ${result.ratio}%\n\n` +
          `## Compressed Content\n\n` +
          `${result.compressed}`;

        return { content: [textContent(summary)] };
      } catch (error) {
        return formatToolError(error, 'Failed to compress artifact.');
      }
    },
  );
}
