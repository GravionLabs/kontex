import type { CavemanLevel, CompressionResult } from '@gravionlabs/kontex-compress';
import { compressToCaveman } from '@gravionlabs/kontex-compress';
import rules from '@gravionlabs/kontex-compress/rules' with { type: 'json' };

export type ArtifactKind = 'prompt' | 'skill' | 'agent';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function cleanPunctuation(text: string): string {
  return text
    .replace(/^\s*[,;.]\s*/gm, '')
    .replace(/\s+[,;]/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/(\w)\s+\./, '$1.');
}

function compressKindSpecific(kind: ArtifactKind, text: string): string {
  if (kind === 'prompt') {
    return text
      .replace(/Please\s+/gi, '')
      .replace(/thank you/gi, '')
      .replace(/\b(be|stay|remain)\s+(brief|concise|short|clear)\b/gi, '')
      .replace(/\b(in\s+)?(simple|plain|clear)\s+language\b/gi, '');
  }
  if (kind === 'skill') {
    return text.replace(/^###\s+/gm, '## ');
  }
  if (kind === 'agent') {
    return text
      .replace(/You are an? (AI|agent|assistant)\s+/gi, '')
      .replace(/Your role is to/gi, '')
      .replace(/You should\s+/gi, '');
  }
  return text;
}

export function compressArtifact(kind: ArtifactKind, content: string, level: CavemanLevel = 'full'): CompressionResult {
  const useAbbreviations = level === 'full' || level === 'ultra' || level === 'wenyan';

  const result = compressToCaveman(content, level);
  if (result.originalLen === 0 || level === 'off') return result;

  let text = result.compressed;

  if (useAbbreviations) {
    text = shortenByAbbreviations(text);
    text = compressKindSpecific(kind, text);
    text = cleanPunctuation(text);
  }

  const compressedLen = text.length;
  const ratio = result.originalLen > 0 ? Math.round((1 - compressedLen / result.originalLen) * 100) : 0;
  return { compressed: text, originalLen: result.originalLen, compressedLen, ratio };
}

export { compressToCaveman };
