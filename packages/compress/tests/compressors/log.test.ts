import { describe, it, expect } from 'vitest';
import { compressLog } from '../../src/compressors/log.js';

describe('compressLog', () => {
  it('returns empty for empty input', () => {
    const r = compressLog('', 'full');
    expect(r.compressed).toBe('');
    expect(r.ratio).toBe(0);
  });

  it('returns content at off level', () => {
    const content = 'line1\nline2';
    const r = compressLog(content, 'off');
    expect(r.compressed).toBe(content);
    expect(r.ratio).toBe(0);
  });

  it('keeps error lines', () => {
    const content = 'info: starting\nERROR: something broke\ninfo: continuing';
    const r = compressLog(content, 'full');
    expect(r.compressed).toContain('ERROR: something broke');
  });

  it('keeps warn and fatal lines', () => {
    const content = 'FATAL: crash\nWARN: unstable\ninfo: whatever';
    const r = compressLog(content, 'full');
    expect(r.compressed).toContain('FATAL: crash');
    expect(r.compressed).toContain('WARN: unstable');
  });

  it('collapses repeated lines with count', () => {
    const content = 'line1\n' + 'WARN: repeated\n'.repeat(10) + 'line2';
    const r = compressLog(content, 'full');
    expect(r.compressed).toContain('<repeated');
  });

  it('strips passing lines at ultra/wenyan', () => {
    const content = 'PASS: test1\ninfo: log\nSUCCESS: done\nOK\nmore';
    const r = compressLog(content, 'ultra');
    expect(r.compressed).not.toMatch(/\bPASS:/);
    expect(r.compressed).not.toMatch(/\bSUCCESS:/);
    expect(r.compressed).not.toMatch(/\bOK\b/);
  });

  it('keeps passing lines at full level', () => {
    const content = 'PASS: test1\ninfo: log';
    const r = compressLog(content, 'full');
    expect(r.compressed).toContain('PASS: test1');
  });

  it('keeps first and last lines when errors present', () => {
    const content = ['start', 'middle1', 'middle2', 'ERROR: fail', 'middle3', 'middle4', 'end'].join('\n');
    const r = compressLog(content, 'full');
    expect(r.compressed).toContain('start');
    expect(r.compressed).toContain('end');
    expect(r.compressed).toContain('ERROR: fail');
  });

  it('calculates ratio', () => {
    const content = 'info: line\n'.repeat(100);
    const r = compressLog(content, 'ultra');
    expect(r.ratio).toBeGreaterThan(0);
    expect(r.originalLen).toBe(content.length);
  });
});
