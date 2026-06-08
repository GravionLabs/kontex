import { describe, expect, it, vi } from 'vitest';
import { EventBus, createSessionId } from '../src/event-bus.js';
import type { SessionStartPayload, UserPromptSubmittedPayload } from '../src/event-bus.js';

describe('EventBus', () => {
  it('fires handler on emit', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('sessionStart', handler);
    bus.emit({
      timestamp: 1,
      sessionId: 'sess_test',
      phase: 'sessionStart',
      data: {},
    } as SessionStartPayload);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('passes payload to handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const payload: SessionStartPayload = {
      timestamp: 100,
      sessionId: 'sess_123',
      phase: 'sessionStart',
      data: { projectPath: '/test' },
    };

    bus.on('sessionStart', handler);
    bus.emit(payload);

    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('fires multiple handlers for same phase', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('sessionStart', a);
    bus.on('sessionStart', b);
    bus.emit({
      timestamp: 1,
      sessionId: 's',
      phase: 'sessionStart',
      data: {},
    } as SessionStartPayload);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not fire handlers for different phase', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('sessionStart', handler);
    bus.emit({
      timestamp: 1,
      sessionId: 's',
      phase: 'sessionEnd',
      data: {},
    } as SessionStartPayload);

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes handler via off', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('sessionStart', handler);
    bus.off('sessionStart', handler);
    bus.emit({
      timestamp: 1,
      sessionId: 's',
      phase: 'sessionStart',
      data: {},
    } as SessionStartPayload);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when handler throws', () => {
    const bus = new EventBus();
    const throwing = vi.fn(() => {
      throw new Error('oops');
    });
    const healthy = vi.fn();

    bus.on('sessionStart', throwing);
    bus.on('sessionStart', healthy);

    expect(() => {
      bus.emit({
        timestamp: 1,
        sessionId: 's',
        phase: 'sessionStart',
        data: {},
      } as SessionStartPayload);
    }).not.toThrow();

    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it('handles async handlers', async () => {
    const bus = new EventBus();
    const handler = vi.fn(async () => {});

    bus.on('sessionStart', handler);
    bus.emit({
      timestamp: 1,
      sessionId: 's',
      phase: 'sessionStart',
      data: {},
    } as SessionStartPayload);

    // Wait for microtask queue to flush
    await new Promise(process.nextTick);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('createSessionId', () => {
  it('generates string starting with sess_', () => {
    expect(createSessionId()).toMatch(/^sess_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createSessionId()));
    expect(ids.size).toBe(100);
  });
});
