import rules from './compression-rules.json' with { type: 'json' };
import { detokenize, tokenize } from './tokenize.js';
import type { CompressionLevel, CompressionResult, Segment } from './types.js';

type RuleCategory = 'fillers' | 'pleasantries' | 'hedges' | 'leaders' | 'articles';

const CATEGORY_LEVELS: Record<CompressionLevel, RuleCategory[]> = {
  off: [],
  lite: ['fillers', 'pleasantries', 'hedges', 'leaders'],
  full: ['fillers', 'pleasantries', 'hedges', 'leaders', 'articles'],
  ultra: ['fillers', 'pleasantries', 'hedges', 'leaders', 'articles'],
  wenyan: ['fillers', 'pleasantries', 'hedges', 'leaders', 'articles'],
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortByLengthDesc(phrases: string[]): string[] {
  return [...phrases].sort((a, b) => b.length - a.length);
}

function removePhrases(text: string, phrases: string[]): string {
  if (phrases.length === 0) return text;
  const pattern = new RegExp(`\\b(?:${sortByLengthDesc(phrases).map(escapeRe).join('|')})\\b`, 'gi');
  return text.replace(pattern, '');
}

function shortenByAbbreviations(text: string): string {
  const entries = Object.entries(rules.abbreviations).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [from, to] of entries) {
    const re = new RegExp(`\\b${escapeRe(from)}\\b`, 'gi');
    result = result.replace(re, (match) => {
      if (match === match.toUpperCase()) return to.toUpperCase();
      if (match[0] === match[0]?.toUpperCase()) return to[0]?.toUpperCase() + to.slice(1);
      return to;
    });
  }
  return result;
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^ +| +$/gm, '');
}

function extractFrontmatter(content: string): { frontmatter: string; body: string } {
  if (!content.startsWith('---')) return { frontmatter: '', body: content };
  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      return {
        frontmatter: lines.slice(0, i + 1).join('\n'),
        body: lines.slice(i + 1).join('\n'),
      };
    }
  }
  return { frontmatter: '', body: content };
}

function processBody(body: string, level: CompressionLevel, categories: RuleCategory[], useAbbreviations: boolean): string {
  const segments = tokenize(body);
  const processed: Segment[] = segments.map((seg) => {
    if (seg.preserved || seg.kind !== 'prose') return seg;
    let text = seg.text;

    for (const cat of categories) {
      const phrases = (rules[cat] as Record<string, string[]>)[level];
      text = removePhrases(text, phrases);
    }

    if (useAbbreviations) {
      text = shortenByAbbreviations(text);
    }

    return { ...seg, text };
  });
  return collapseWhitespace(detokenize(processed));
}

function cleanPunctuation(text: string): string {
  return text
    .replace(/^\s*[,;.]\s*/gm, '')
    .replace(/\s+[,;]/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/(\w)\s+\./, '$1.');
}

export function compress(content: string, level: CompressionLevel = 'full'): CompressionResult {
  if (!content || content.trim().length === 0) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (level === 'off') {
    return { compressed: content, originalLen: content.length, compressedLen: content.length, ratio: 0 };
  }

  if (content.length > 50000) {
    throw new Error('Input exceeds maximum length of 50000 characters.');
  }

  const { frontmatter, body } = extractFrontmatter(content);
  const categories = CATEGORY_LEVELS[level];
  const useAbbreviations = level === 'ultra' || level === 'wenyan';

  let compressed = processBody(body, level, categories, useAbbreviations);
  compressed = cleanPunctuation(compressed);

  if (level === 'wenyan') {
    compressed = compressed
      .replace(/this is /gi, '')
      .replace(/there is /gi, '')
      .replace(/it is /gi, '')
      .replace(/that is /gi, '')
      .replace(/are /gi, '')
      .replace(/be /gi, '')
      .replace(/have /gi, '')
      .replace(/has /gi, '')
      .replace(/with /gi, '')
      .replace(/from /gi, '')
      .replace(/should /gi, '')
      .replace(/could /gi, '')
      .replace(/would /gi, '');
    compressed = compressed
      .replace(/\. /g, '. ')
      .replace(/"?([^.!?]*)"/g, '$1')
      .replace(/\b(the|this|that|these|those)\b/gi, '')
      .replace(/\s{2,}/g, ' ');
  }

  const final = frontmatter ? `${frontmatter}\n${compressed}` : compressed;
  const originalLen = content.length;
  const compressedLen = final.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed: final, originalLen, compressedLen, ratio };
}
