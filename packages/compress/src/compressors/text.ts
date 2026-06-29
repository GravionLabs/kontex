import rules from '../compression-rules.json' with { type: 'json' };
import { detokenize, tokenize } from '../tokenize.js';
import type { CompressionLevel, CompressionResult } from '../types.js';

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

function applyQuantityOperators(text: string): string {
  return text
    .replace(/\b(?:approximately|approx|about)\s+(\d+)\b/gi, '≈$1')
    .replace(/\bat\s+least\s+(\d+)\b/gi, '≥$1')
    .replace(/\b(?:at\s+most|no\s+more\s+than)\s+(\d+)\b/gi, '≤$1')
    .replace(/\b(?:more\s+than|greater\s+than|over)\s+(\d+)\b/gi, '>$1')
    .replace(/\b(?:fewer\s+than|less\s+than|under)\s+(\d+)\b/gi, '<$1');
}

function removeRepetitions(text: string, level: CompressionLevel): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (level === 'full') {
      const exact = trimmed.toLowerCase();
      if (seen.has(exact)) continue;
      seen.add(exact);
      result.push(s);
    } else {
      const words = trimmed.toLowerCase().split(/\s+/);
      let duplicate = false;
      for (const prior of seen) {
        const priorWords = prior.split(/\s+/);
        const overlap = words.filter((w) => priorWords.includes(w)).length;
        const ratio = overlap / Math.max(words.length, priorWords.length);
        if (ratio > 0.8) {
          duplicate = true;
          break;
        }
      }
      if (duplicate) continue;
      seen.add(trimmed.toLowerCase());
      result.push(s);
    }
  }
  return result.join(' ');
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

function processBody(
  body: string,
  level: CompressionLevel,
  categories: RuleCategory[],
  useAbbreviations: boolean,
): string {
  const segments = tokenize(body);
  const processed = segments.map((seg) => {
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

export function compressText(content: string, level: CompressionLevel): CompressionResult {
  const { frontmatter, body } = extractFrontmatter(content);
  const categories = CATEGORY_LEVELS[level];
  const useAbbreviations = level === 'ultra' || level === 'wenyan';

  let compressed = processBody(body, level, categories, useAbbreviations);

  if (level !== 'lite') {
    compressed = removeRepetitions(compressed, level);
  }

  if (level === 'ultra' || level === 'wenyan') {
    compressed = applyQuantityOperators(compressed);
  }

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
