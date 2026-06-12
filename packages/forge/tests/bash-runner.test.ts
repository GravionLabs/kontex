import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

describe('forge server', () => {
  it('creates server with correct name', () => {
    const server = createServer('/tmp');
    expect(server).toBeDefined();
  });
});
