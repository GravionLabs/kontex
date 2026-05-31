import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ProjectRegistry } from './services/project-registry.js';
import { SpecStore } from './services/spec-store.js';
import { registerListSpecsTool } from './tools/list-specs.js';
import { registerLoadSpecTool } from './tools/load-spec.js';
import { registerReindexSpecsTool } from './tools/reindex-specs.js';
import { registerSearchSpecsTool } from './tools/search-specs.js';
import { registerTeamsContextTool } from './tools/teams-context.js';

export const SERVER_NAME = 'mcp-spec-server';
export const SERVER_VERSION = '1.0.0';

export function createServer(rootDir = process.cwd()): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const projectRegistry = new ProjectRegistry(rootDir);
  const store = new SpecStore(projectRegistry);

  registerListSpecsTool(server, store);
  registerLoadSpecTool(server, store);
  registerSearchSpecsTool(server, store);
  registerTeamsContextTool(server, store);
  registerReindexSpecsTool(server, store);

  return server;
}
