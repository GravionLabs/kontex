export interface HookPayload {
  timestamp: number;
  sessionId: string;
  phase: string;
  data: Record<string, unknown>;
}

export interface SessionStartPayload extends HookPayload {
  phase: 'sessionStart';
  data: {
    userId?: string;
    projectPath?: string;
    config?: Record<string, unknown>;
  };
}

export interface SessionEndPayload extends HookPayload {
  phase: 'sessionEnd';
  data: {
    duration?: number;
    exitCode?: number;
    observations?: number;
  };
}

export interface UserPromptSubmittedPayload extends HookPayload {
  phase: 'userPromptSubmitted';
  data: {
    originalPrompt: string;
    tokens?: number;
    length?: number;
  };
}

export interface PreCompactPayload extends HookPayload {
  phase: 'preCompact';
  data: {
    content: string;
    originalLength: number;
  };
}

export interface PreToolUsePayload extends HookPayload {
  phase: 'preToolUse';
  data: {
    toolName: string;
    args?: Record<string, unknown>;
    timestamp?: number;
  };
}

export interface PostToolUsePayload extends HookPayload {
  phase: 'postToolUse';
  data: {
    toolName: string;
    result?: unknown;
    duration?: number;
    success?: boolean;
  };
}

export interface ErrorOccurredPayload extends HookPayload {
  phase: 'errorOccurred';
  data: {
    errorType: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
}

export type AnyHookPayload =
  | SessionStartPayload
  | SessionEndPayload
  | UserPromptSubmittedPayload
  | PreCompactPayload
  | PreToolUsePayload
  | PostToolUsePayload
  | ErrorOccurredPayload;

export type HookPhase = AnyHookPayload['phase'];

export type HookHandler = (payload: AnyHookPayload) => void | Promise<void>;

export class EventBus {
  private listeners = new Map<HookPhase, Set<HookHandler>>();

  on(phase: HookPhase, handler: HookHandler): void {
    if (!this.listeners.has(phase)) {
      this.listeners.set(phase, new Set());
    }
    this.listeners.get(phase)?.add(handler);
  }

  off(phase: HookPhase, handler: HookHandler): void {
    this.listeners.get(phase)?.delete(handler);
  }

  emit(payload: AnyHookPayload): void {
    const handlers = this.listeners.get(payload.phase);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        void Promise.resolve(handler(payload));
      } catch {
        // individual handler error shouldn't break others
      }
    }
  }
}

export const globalEventBus = new EventBus();

export function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
