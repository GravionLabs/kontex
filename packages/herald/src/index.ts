import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerErrorHandlingHooks } from './hooks/error-handling.js';
import { registerPreCompactHook } from './hooks/pre-compact.js';
import { registerSessionLifecycleHooks } from './hooks/session-lifecycle.js';
import { registerToolLifecycleHooks } from './hooks/tool-lifecycle.js';
import { registerUserInteractionHooks } from './hooks/user-interaction.js';
import { initCavememIntegration } from './memory/cavemem.js';
import { initHookDispatch } from './services/hook-dispatch.js';
import { registerRecallSessionTool } from './tools/recall-session.js';
import { registerSetCavemanModeTool } from './tools/set-caveman-mode.js';
import { registerStripAndCompactTool } from './tools/strip-and-compact.js';

export interface CliPluginOptions {
  cavememDbPath?: string;
}

export async function initCliPlugin(server: McpServer, options?: CliPluginOptions): Promise<void> {
  registerPreCompactHook(server);
  registerSessionLifecycleHooks(server);
  registerUserInteractionHooks(server);
  registerToolLifecycleHooks(server);
  registerErrorHandlingHooks(server);
  registerSetCavemanModeTool(server);
  registerStripAndCompactTool(server);
  registerRecallSessionTool(server);

  await initCavememIntegration(options?.cavememDbPath);

  initHookDispatch();
}
