import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DevToolsRegistry } from './services/devtools-registry.js';
import { registerBashRunnerTool } from './tools/bash-runner.js';
import { registerCargoRunnerTool } from './tools/cargo-runner.js';
import { registerDotnetRunnerTool } from './tools/dotnet-runner.js';
import { registerNpmRunnerTool } from './tools/npm-runner.js';
import { registerPytestRunnerTool } from './tools/pytest-runner.js';

export const SERVER_NAME = '@gravionlabs/kontex-forge';
export const SERVER_VERSION = '1.0.0';

export function createServer(rootDir = process.cwd()): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const registry = new DevToolsRegistry(rootDir);

  registerBashRunnerTool(server, registry);
  registerPytestRunnerTool(server, registry);
  registerDotnetRunnerTool(server, registry);
  registerNpmRunnerTool(server, registry);
  registerCargoRunnerTool(server, registry);

  return server;
}
