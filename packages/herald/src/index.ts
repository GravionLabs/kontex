import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerErrorHandlingHooks } from './hooks/error-handling.js';
import { registerPreCompactHook } from './hooks/pre-compact.js';
import { registerSessionLifecycleHooks } from './hooks/session-lifecycle.js';
import { registerToolLifecycleHooks } from './hooks/tool-lifecycle.js';
import { registerUserInteractionHooks } from './hooks/user-interaction.js';
import { initMemoryStore } from './memory/memory-store.js';
import { initHookDispatch } from './services/hook-dispatch.js';
import { registerRecallSessionTool } from './tools/recall-session.js';
import { registerSetCompressionLevelTool } from './tools/set-compression-level.js';
import { registerStripAndCompactTool } from './tools/strip-and-compact.js';

export interface CliPluginOptions {
  memoryStorePath?: string;
}

export async function initCliPlugin(server: McpServer, options?: CliPluginOptions): Promise<void> {
  registerPreCompactHook(server);
  registerSessionLifecycleHooks(server);
  registerUserInteractionHooks(server);
  registerToolLifecycleHooks(server);
  registerErrorHandlingHooks(server);
  registerSetCompressionLevelTool(server);
  registerStripAndCompactTool(server);
  registerRecallSessionTool(server);

  await initMemoryStore(options?.memoryStorePath);

  initHookDispatch();
}
