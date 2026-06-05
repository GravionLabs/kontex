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
  | PreToolUsePayload
  | PostToolUsePayload
  | ErrorOccurredPayload;

export type HookHandler = (payload: AnyHookPayload) => void | Promise<void>;

export interface HookRegistry {
  sessionStart: HookHandler[];
  sessionEnd: HookHandler[];
  userPromptSubmitted: HookHandler[];
  preToolUse: HookHandler[];
  postToolUse: HookHandler[];
  errorOccurred: HookHandler[];
}

export function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
