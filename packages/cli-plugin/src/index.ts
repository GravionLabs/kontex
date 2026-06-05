import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerErrorHandlingHooks } from './hooks/error-handling.js';
import { registerPreCompactHook } from './hooks/pre-compact.js';
import { registerSessionLifecycleHooks } from './hooks/session-lifecycle.js';
import { registerToolLifecycleHooks } from './hooks/tool-lifecycle.js';
import { registerUserInteractionHooks } from './hooks/user-interaction.js';
import { initCavememIntegration } from './memory/cavemem.js';

export interface CliPluginOptions {
  cavememDbPath?: string;
}

export async function initCliPlugin(server: McpServer, options?: CliPluginOptions): Promise<void> {
  // Register all hooks
  registerPreCompactHook(server);
  registerSessionLifecycleHooks(server);
  registerUserInteractionHooks(server);
  registerToolLifecycleHooks(server);
  registerErrorHandlingHooks(server);

  // Initialize cavemem integration for persistent memory
  await initCavememIntegration(options?.cavememDbPath);
}
