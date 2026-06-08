import type {
  BudgetStatus,
  ErrorOccurredPayload,
  PostToolUsePayload,
  PreCompactPayload,
  PreToolUsePayload,
  SessionEndPayload,
  SessionStartPayload,
  UserPromptSubmittedPayload,
} from '@kontex/types';
import { ContextBudget, globalCavemanMode, globalContextBudget, globalEventBus } from '@kontex/types';
import { getCavememStore } from '../memory/cavemem.js';

let initialized = false;

export function initHookDispatch(): void {
  if (initialized) return;
  initialized = true;

  globalEventBus.on('sessionStart', (payload) => {
    const p = payload as SessionStartPayload;
    globalContextBudget.reset();

    const cavemem = getCavememStore();
    if (cavemem) {
      cavemem.storeSession({
        sessionId: p.sessionId,
        projectPath: (p.data.projectPath as string) ?? process.cwd(),
        mode: globalCavemanMode.level,
        startedAt: new Date(p.timestamp).toISOString(),
        endedAt: null,
        totalTokens: null,
        totalSaved: null,
      });
    }

    console.log(`[ctx] Session ${p.sessionId} started`);
  });

  globalEventBus.on('sessionEnd', (payload) => {
    const p = payload as SessionEndPayload;
    const pct = Math.round(globalContextBudget.ratio * 100);

    const cavemem = getCavememStore();
    if (cavemem) {
      const totalSaved = cavemem.sessionTotalSaved(p.sessionId);
      cavemem.storeSession({
        sessionId: p.sessionId,
        projectPath: process.cwd(),
        mode: globalCavemanMode.level,
        startedAt: new Date().toISOString(),
        endedAt: new Date(p.timestamp).toISOString(),
        totalTokens: globalContextBudget.usedTokens,
        totalSaved,
      });
    }

    console.log(
      `[ctx] Session ${p.sessionId} ended (exit: ${p.data.exitCode ?? 0}) — ` +
        `${globalContextBudget.usedTokens}/${globalContextBudget.totalAllowed} (${pct}%)`,
    );
  });

  globalEventBus.on('userPromptSubmitted', (payload) => {
    const p = payload as UserPromptSubmittedPayload;
    const tokens = p.data.tokens ?? ContextBudget.estimateTokens(p.data.originalPrompt);
    const status = globalContextBudget.addTokens(tokens);
    logBudget(status);

    const cavemem = getCavememStore();
    if (cavemem) {
      cavemem.storeObservation(p.sessionId, 'userPrompt', 'prompt', p.data.originalPrompt);
    }

    if (status === 'compress' && globalCavemanMode.level !== 'ultra') {
      globalCavemanMode.setLevel('ultra');
    }
  });

  globalEventBus.on('preCompact', (payload) => {
    const p = payload as PreCompactPayload;
    const tokens = ContextBudget.estimateTokens(p.data.content);
    const status = globalContextBudget.addTokens(tokens);
    logBudget(status);

    const cavemem = getCavememStore();
    if (cavemem) {
      cavemem.storeObservation(p.sessionId, 'preCompact', 'compact', p.data.content);
    }
  });

  globalEventBus.on('preToolUse', (payload) => {
    const p = payload as PreToolUsePayload;
    console.log(`[ctx] Pre: ${p.data.toolName}`);
  });

  globalEventBus.on('postToolUse', (payload) => {
    const p = payload as PostToolUsePayload;
    const dur = p.data.duration ?? 0;
    const ok = p.data.success ? '?' : '?';
    console.log(`[ctx] Post: ${p.data.toolName} ${dur}ms ${ok}`);

    if (typeof p.data.result === 'string') {
      const tokens = ContextBudget.estimateTokens(p.data.result);
      const status = globalContextBudget.addTokens(tokens);
      logBudget(status);

      const cavemem = getCavememStore();
      if (cavemem) {
        cavemem.storeObservation(p.sessionId, 'toolResult', p.data.toolName, p.data.result);
      }

      if (status === 'compress' && globalCavemanMode.level !== 'ultra') {
        globalCavemanMode.setLevel('ultra');
      }
    }
  });

  globalEventBus.on('errorOccurred', (payload) => {
    const p = payload as ErrorOccurredPayload;
    console.log(`[ctx] Error: ${p.data.errorType} - ${p.data.message}`);

    const cavemem = getCavememStore();
    if (cavemem) {
      cavemem.storeObservation(p.sessionId, 'error', p.data.errorType, `${p.data.errorType}: ${p.data.message}`);
    }
  });

  globalCavemanMode.onChange((newLevel, oldLevel) => {
    console.log(`[ctx] Mode: ${oldLevel} ? ${newLevel}`);
  });
}

function logBudget(status: BudgetStatus): void {
  const pct = Math.round(globalContextBudget.ratio * 100);
  const sigil = status === 'panic' ? '!' : status === 'compress' ? '~' : status === 'warn' ? '?' : '+';
  console.log(
    `[ctx] Budget: [${sigil}] ${globalContextBudget.usedTokens}/${globalContextBudget.totalAllowed} (${pct}%) — ${status}`,
  );
}
