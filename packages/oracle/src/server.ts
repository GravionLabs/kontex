import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRecommendModelTool } from './tools/recommend-model.js';

export const SERVER_NAME = '@kontex/oracle';
export const SERVER_VERSION = '1.0.0';

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerRecommendModelTool(server);
  return server;
}
