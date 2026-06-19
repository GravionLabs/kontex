import { describe, expect, it } from 'vitest';
import { compressArtifact } from '../src/services/compression.js';

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

    it('compresses frontmatter description while preserving other YAML keys', () => {
      const input = `---
title: Test
description: Please be brief. Use the database for all storage.
---
Please be brief. Use the database.`;
      const result = compressArtifact('prompt', input);
      expect(result.compressed).toContain('title: Test');
      expect(result.compressed).toContain('description:');
      expect(result.compressed).not.toContain('Please');
      expect(result.compressed).toContain('DB');
    });

    it('preserves block scalar format in frontmatter description', () => {
      const input = `---
name: my-agent
description: >
  Basically just use this skill when creating projects.
  Really helpful for code generation.
model: claude-sonnet-4.6
---
Body content here.`;
      const result = compressArtifact('prompt', input);
      expect(result.compressed).toContain('name: my-agent');
      expect(result.compressed).toContain('description: >');
      expect(result.compressed).toContain('model: claude-sonnet-4.6');
      expect(result.compressed).not.toContain('Basically');
      expect(result.compressed).not.toContain('Really');
      expect(result.compressed).toMatch(/^\s+\S/m);
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


});
