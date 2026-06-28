import { describe, expect, it, vi } from 'vitest';
import { CompressionModeStore, PHASE_COMPRESSION_MAP } from '../src/compression-mode.js';

describe('CompressionModeStore', () => {
  it('default level is off', () => {
    const store = new CompressionModeStore();
    expect(store.level).toBe('off');
  });

  it('setLevel updates the level', () => {
    const store = new CompressionModeStore();
    store.setLevel('ultra');
    expect(store.level).toBe('ultra');
  });

  it('setLevel fires onChange listeners', () => {
    const store = new CompressionModeStore();
    const listener = vi.fn();

    store.onChange(listener);
    store.setLevel('full');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('full', 'off');
  });

  it('onChange unsubscribe removes listener', () => {
    const store = new CompressionModeStore();
    const listener = vi.fn();

    const unsub = store.onChange(listener);
    unsub();
    store.setLevel('ultra');

    expect(listener).not.toHaveBeenCalled();
  });

  it('getEffectiveLevel returns phase default when level is off', () => {
    const store = new CompressionModeStore();
    expect(store.getEffectiveLevel('analysis')).toBe('lite');
    expect(store.getEffectiveLevel('implementation')).toBe('ultra');
  });

  it('getEffectiveLevel returns lite for deploy phase when level is off', () => {
    const store = new CompressionModeStore();
    expect(store.getEffectiveLevel('deploy')).toBe('lite');
  });

  it('getEffectiveLevel returns full for unknown phase', () => {
    const store = new CompressionModeStore();
    expect(store.getEffectiveLevel('unknown')).toBe('full');
  });

  it('getEffectiveLevel returns full when no phase given', () => {
    const store = new CompressionModeStore();
    expect(store.getEffectiveLevel()).toBe('full');
  });

  it('getEffectiveLevel uses explicit level when set', () => {
    const store = new CompressionModeStore();
    store.setLevel('lite');
    expect(store.getEffectiveLevel('implementation')).toBe('lite');
  });
});

describe('PHASE_COMPRESSION_MAP', () => {
  it('maps analysis to lite', () => {
    expect(PHASE_COMPRESSION_MAP.analysis).toBe('lite');
  });

  it('maps planning to full', () => {
    expect(PHASE_COMPRESSION_MAP.planning).toBe('full');
  });

  it('maps implementation to ultra', () => {
    expect(PHASE_COMPRESSION_MAP.implementation).toBe('ultra');
  });

  it('maps testing to full', () => {
    expect(PHASE_COMPRESSION_MAP.testing).toBe('full');
  });

  it('maps verification to lite', () => {
    expect(PHASE_COMPRESSION_MAP.verification).toBe('lite');
  });

  it('maps deploy to lite', () => {
    expect(PHASE_COMPRESSION_MAP.deploy).toBe('lite');
  });
});
