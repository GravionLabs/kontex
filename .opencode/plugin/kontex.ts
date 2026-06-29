import path from 'node:path';
import { compress } from '@gravionlabs/kontex-compress';
import { MemoryStore } from '@gravionlabs/kontex-herald/dist/memory/memory-store.js';
import {
  COMPRESSION_LEVELS,
  type CompressionLevel,
  ContextBudget,
  createSessionId,
  globalCompressionMode,
} from '@gravionlabs/kontex-types';
import { tool } from '@opencode-ai/plugin';
import type { Plugin, PluginInput, PluginOptions } from '@opencode-ai/plugin';

const SAVINGS_PCT: Record<CompressionLevel, string> = {
  off: '0%',
  lite: '~20%',
  full: '~50%',
  ultra: '~75%',
  wenyan: '~85%',
};

export const server: Plugin = async (input: PluginInput, _options?: PluginOptions) => {
  const dbPath = process.env.KONTEX_CAVEMEM_PATH
    ? path.resolve(input.directory, process.env.KONTEX_CAVEMEM_PATH)
    : path.resolve(input.directory, '.kontex/cavemem.db');

  const memStore = new MemoryStore(dbPath);
  const sessionId = createSessionId();
  const budget = new ContextBudget();

  memStore.storeSession({
    sessionId,
    projectPath: input.directory,
    mode: 'opencode',
    startedAt: new Date().toISOString(),
    endedAt: null,
    totalTokens: null,
    totalSaved: null,
  });

  return {
    async event({ event }) {
      try {
        if (event.type === 'message.updated') {
          const msg = (event as { type: string; properties: { info: unknown } }).properties.info as {
            role?: string;
            sessionID?: string;
            time?: { completed?: number };
            modelID?: string;
            providerID?: string;
            tokens?: { input: number; output: number; reasoning: number };
            cost?: number;
          };

          if (msg.role === 'assistant' && msg.time?.completed != null) {
            const text = JSON.stringify({
              sessionID: msg.sessionID,
              modelID: msg.modelID,
              providerID: msg.providerID,
              tokens: msg.tokens,
              cost: msg.cost,
            });

            const level = globalCompressionMode.getEffectiveLevel('implementation');
            const result = compress(text, level);
            const tokens = ContextBudget.estimateTokens(text);

            budget.addTokens(tokens);
            if (budget.status === 'compress' || budget.status === 'panic') {
              const current = globalCompressionMode.level;
              if (current === 'off' || current === 'lite' || current === 'full') {
                globalCompressionMode.setLevel('ultra');
              }
            }

            memStore.storeObservation(
              sessionId,
              'implementation',
              event.type,
              text,
            );
          }
        }
      } catch {
        // never throw from event hook
      }
    },

    tool: {
      'set-compression-level': tool({
        description:
          'Set the compression level for this opencode session. Controls how aggressively context is compressed.',
        args: {
          level: tool.schema.enum(COMPRESSION_LEVELS as unknown as [string, ...string[]]),
        },
        async execute({ level }) {
          const lvl = level as CompressionLevel;
          globalCompressionMode.setLevel(lvl);
          const savings = SAVINGS_PCT[lvl] ?? '?';
          return `Compression level set to "${lvl}". Expected token savings: ${savings}.`;
        },
      }),
    },

    async dispose() {
      try {
        const totalSaved = memStore.sessionTotalSaved(sessionId);
        memStore.storeSession({
          sessionId,
          projectPath: input.directory,
          mode: 'opencode',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          totalTokens: budget.usedTokens,
          totalSaved,
        });
      } finally {
        memStore.close();
      }
    },
  };
};
