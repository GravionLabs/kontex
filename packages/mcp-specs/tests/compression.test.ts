import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { compressArtifact, compressToCaveman } from '../src/services/compression.js';

describe('compression service', () => {
  describe('compressArtifact', () => {
    it('returns empty for empty content', () => {
      const result = compressArtifact('prompt', '');
      expect(result.compressed).toBe('');
      expect(result.originalLen).toBe(0);
      expect(result.ratio).toBe(0);
    });

    it('returns empty for whitespace-only content', () => {
      const result = compressArtifact('prompt', '   \n\n  ');
      expect(result.compressed).toBe('');
    });

    it('drops filler words', () => {
      const input =
        'Please, this is really just basically about authentication. Certainly, actually, it is important to understand this.';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).not.toContain('really');
      expect(result.compressed).not.toContain('basically');
      expect(result.compressed).not.toContain('Please');
      expect(result.compressed).not.toContain('Certainly');
    });

    it('shortens verbose terms', () => {
      const input = 'Database implementation with authentication configuration for request response handling.';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).toContain('DB');
      expect(result.compressed).toContain('auth');
      expect(result.compressed).toContain('config');
      expect(result.compressed).toContain('req');
      expect(result.compressed).toContain('res');
    });

    it('drops articles', () => {
      const input = 'The function is a tool for the authentication layer.';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).not.toMatch(/\bthe\b/i);
      expect(result.compressed).not.toMatch(/\ba\b/i);
    });

    it('prompt: removes tone instructions', () => {
      const input = 'Please be brief and concise. Stay clear and in simple language. Thank you for your help.';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).not.toContain('brief');
      expect(result.compressed).not.toContain('Thank you');
      expect(result.compressed).not.toContain('simple language');
    });

    it('skill: reduces heading levels', () => {
      const input = '## Skill\n\n### Section 1\nContent here.\n### Section 2\nMore content.';
      const result = compressArtifact('skill', input);
      expect(result.compressed).toContain('## Section 1');
      expect(result.compressed).toContain('## Section 2');
    });

    it('agent: removes agent role prefixes', () => {
      const input = 'You are an AI assistant. Your role is to help with coding. You should always follow the rules.';
      const result = compressArtifact('agent', input);
      expect(result.compressed).not.toContain('You are an');
      expect(result.compressed).not.toContain('Your role is');
      expect(result.compressed).not.toContain('You should');
    });

    it('collapses multiple newlines', () => {
      const input = 'Line 1\n\n\n\nLine 2\n\n\n\nLine 3';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).not.toContain('\n\n\n');
    });

    it('calculates compression ratio correctly', () => {
      const input =
        'This is a very long string with lots of unnecessary information that should be compressed considerably.';
      const result = compressArtifact('prompt', input);
      expect(result.originalLen).toBe(input.length);
      expect(result.compressedLen).toBeGreaterThan(0);
      expect(result.compressedLen).toBeLessThan(result.originalLen);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.ratio).toBeLessThanOrEqual(100);
    });

    it('preserves code-like content within prose', () => {
      const input = 'Use function parseJSON() to parse config. The DB connection pool size must be < 50.';
      const result = compressArtifact('prompt', input);
      expect(result.compressed).toContain('parseJSON()');
      expect(result.compressed).toContain('< 50');
    });

    it('respects max input length', () => {
      const longInput = 'a'.repeat(50001);
      expect(() => {
        compressArtifact('prompt', longInput);
      }).toThrow();
    });

    it('handles mixed content across kinds', () => {
      const input = 'You are an AI agent. The database implementation requires authentication. Please be brief.';

      const promptResult = compressArtifact('prompt', input);
      const skillResult = compressArtifact('skill', input);
      const agentResult = compressArtifact('agent', input);

      // agent removes "You are an AI agent"
      expect(agentResult.compressed).not.toContain('You are an');

      // prompt removes "Please be brief"
      expect(promptResult.compressed).not.toContain('brief');

      // All should compress the DB + auth terms
      [promptResult, skillResult, agentResult].forEach((r) => {
        expect(r.compressed).toContain('DB');
        expect(r.compressed).toContain('auth');
      });
    });

    it('preserves YAML frontmatter', () => {
      const input = `---
title: Test
author: John
---
You are an AI agent. The database implementation requires authentication.`;
      const result = compressArtifact('agent', input);
      expect(result.compressed).toContain('---\ntitle: Test\nauthor: John\n---');
      expect(result.compressed).not.toContain('You are an');
    });

    it('skips compression for frontmatter only', () => {
      const input = `---
title: Test
---
Please be brief. Use the database.`;
      const result = compressArtifact('prompt', input);
      // Frontmatter exact, body compressed
      expect(result.compressed).toContain('---\ntitle: Test\n---');
      expect(result.compressed).not.toContain('Please');
      expect(result.compressed).toContain('DB');
    });

    it('handles content without frontmatter', () => {
      const input = 'You are an AI. Please be brief.';
      const result = compressArtifact('agent', input);
      expect(result.compressed).not.toContain('---');
      expect(result.compressed).not.toContain('You are an');
    });

    it('handles malformed frontmatter markers (only opening)', () => {
      const input = `---
no closing marker
This is content`;
      const result = compressArtifact('prompt', input);
      // Malformed (no closing ---), treats entire content as body to compress
      expect(result.compressed).toContain('---');
    });
  });

  describe('compressToCaveman', () => {
    it('removes pleasantries', () => {
      const input = 'Please thank you for your help. Sure, of course!';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bplease\b|\bthank you\b|\bsure\b|\bof course\b/i);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('removes hedges', () => {
      const input = 'Perhaps this might work. Maybe you could potentially do this. It seems like it appears obvious.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bperhaps\b|\bmight\b|\bmaybe\b|\bcould potentially\b/i);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('removes fillers', () => {
      const input = 'This is just really basically actually very simple, quite essentialy.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bjust\b|\breally\b|\bbasically\b|\bactually\b|\bvery\b/i);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('removes leaders (start-of-line)', () => {
      const input = `I'll help.
I will do it.
You can try.
Let me explain.`;
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/^I'll|^I will|^You can|^Let me/im);
    });

    it('removes articles', () => {
      const input = 'The quick brown fox jumps over a lazy dog. An apple a day.';
      const result = compressToCaveman(input);
      expect(result.compressed).not.toMatch(/\bthe \b|\ba \b|\ban \b/i);
    });

    it('preserves fenced code blocks', () => {
      const input = `Please fix this. Sure!
\`\`\`
just really basically simple code
\`\`\`
Thanks.`;
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('just really basically simple code');
      expect(result.compressed).toMatch(/```/);
    });

    it('preserves inline code', () => {
      const input = 'Please use `just.really.basically` function. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('`just.really.basically`');
    });

    it('preserves URLs', () => {
      const input = 'Please visit https://example.com/path for more. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('https://example.com/path');
    });

    it('preserves paths', () => {
      const input = 'Please check src/services/compression.ts. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('src/services/compression.ts');
    });

    it('preserves CONST_CASE identifiers', () => {
      const input = 'Please use MAX_LENGTH constant. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('MAX_LENGTH');
    });

    it('preserves function calls', () => {
      const input = 'Please call myFunction(arg1, arg2) now. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('myFunction(arg1, arg2)');
    });

    it('preserves version numbers', () => {
      const input = 'Please upgrade to version 1.2.3. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('1.2.3');
    });

    it('preserves frontmatter in caveman compression', () => {
      const input = `---
title: Example
---
Please thank you for this. Sure!`;
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('---\ntitle: Example\n---');
      expect(result.compressed).not.toMatch(/\bplease\b|\bthank you\b/i);
    });

    it('handles mixed content (rules + protected patterns)', () => {
      const input = 'Please visit https://example.com. Sure! Use `just_really` constant CONST_VAR. Thanks!';
      const result = compressToCaveman(input);
      expect(result.compressed).toContain('https://example.com');
      expect(result.compressed).toContain('`just_really`');
      expect(result.compressed).toContain('CONST_VAR');
      expect(result.compressed).not.toMatch(/\bplease\b|\bsure\b|\bthanks\b/i);
    });

    it('handles empty input', () => {
      const result = compressToCaveman('');
      expect(result.compressed).toBe('');
      expect(result.ratio).toBe(0);
    });

    it('calculates compression ratio correctly', () => {
      const input = 'Please thank you really just basically simply very quite essentially.';
      const result = compressToCaveman(input);
      expect(result.originalLen).toBe(input.length);
      expect(result.compressedLen).toBeLessThan(result.originalLen);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.ratio).toBeLessThanOrEqual(100);
    });

    it('throws on oversized input', () => {
      const bigInput = 'x'.repeat(50001);
      expect(() => compressToCaveman(bigInput)).toThrow('Input exceeds maximum length');
    });

    it('compresses real angular-skill.md: frontmatter preserved + fillers removed', () => {
      const filePath = path.join('tests', 'resources', 'angular-skill.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Verify file has content
      expect(content.length).toBeGreaterThan(0);

      // Verify it has frontmatter
      expect(content).toMatch(/^---\nname:/);

      // Compress
      const result = compressToCaveman(content);

      // Verify frontmatter preserved (exact first 16 lines with YAML)
      expect(result.compressed).toContain('---\nname: angular-developer');
      expect(result.compressed).toContain('license: MIT');

      // Verify filler words removed (file contains "actually")
      expect(result.compressed).not.toMatch(/\bactually\b/i);

      // Verify body compressed
      expect(result.compressedLen).toBeLessThan(result.originalLen);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.ratio).toBeLessThanOrEqual(100);
    });
  });
});
