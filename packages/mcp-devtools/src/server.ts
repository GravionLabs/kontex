import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DevToolsRegistry } from './services/devtools-registry.js';
import { registerBashRunnerTool } from './tools/bash-runner.js';

export const SERVER_NAME = '@kontex/mcp-devtools';
export const SERVER_VERSION = '1.0.0';

export function createServer(rootDir = process.cwd()): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const registry = new DevToolsRegistry(rootDir);

  registerBashRunnerTool(server, registry);
  // TODO: Register additional tools (pytest-runner, dotnet-runner, npm-runner, cargo-runner, etc.)

  return server;
}
