import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRecommendModelTool } from '../src/tools/recommend-model.js';

describe('registerRecommendModelTool', () => {
  it('registers the recommend-model tool on the server', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const spy = { called: false };
    const originalRegister = server.registerTool.bind(server);
    server.registerTool = ((name: string, _opts: unknown, _handler: unknown) => {
      if (name === 'recommend-model') spy.called = true;
      return originalRegister(name, _opts as any, _handler as any);
    }) as typeof server.registerTool;

    registerRecommendModelTool(server);
    expect(spy.called).toBe(true);
  });

  it('produces valid output for a typical issue', async () => {
    const { recommendModel } = await import('../src/services/issue-scorer.js');
    const result = await recommendModel({ title: 'feat: add search', body: 'Implement full-text search across all specs', labels: ['enhancement'] });

    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('tier');
    expect(result).toHaveProperty('complexityScore');
    expect(result).toHaveProperty('contextSize');
    expect(result).toHaveProperty('reasoning');
    expect(result).toHaveProperty('overriddenBy');
    expect(['fast', 'balanced', 'powerful']).toContain(result.tier);
    expect(['small', 'medium', 'large']).toContain(result.contextSize);
    expect(result.complexityScore).toBeGreaterThanOrEqual(0);
    expect(result.model).toBeTruthy();
  });
});
