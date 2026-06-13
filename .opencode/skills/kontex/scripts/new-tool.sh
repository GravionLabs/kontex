#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <tool-name>"
  exit 1
fi

NAME="$1"
KEBAB="${NAME//_/-}"
FILE="packages/scribe/src/tools/${KEBAB}.ts"

if [ -f "$FILE" ]; then
  echo "Error: $FILE already exists"
  exit 1
fi

cat > "$FILE" <<EOF
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError, projectSchema, textContent } from '../services/rules.js';
import type { SpecStore } from '../services/spec-store.js';

export function register${NAME^}Tool(server: McpServer, store: SpecStore): void {
  server.registerTool(
    '${KEBAB}',
    {
      title: '${NAME^}',
      description: '',
      inputSchema: {
        project: projectSchema,
      },
    },
    async ({ project }) => {
      try {
        return { content: [textContent('')] };
      } catch (error) {
        return formatToolError(error, '');
      }
    },
  );
}
EOF

echo "Created $FILE"
echo "Next: register in packages/scribe/src/server.ts createServer()"
