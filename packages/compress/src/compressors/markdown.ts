import type { CompressionLevel, CompressionResult } from '../types.js';
import { compressText } from './text.js';

interface Section {
  heading: string;
  body: string[];
}

function parseSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  return sections;
}

function extractCodeFences(content: string): string {
  const fences = content.match(/```[\s\S]*?```|~~~[\s\S]*?~~~/g);
  return fences ? fences.join('\n\n') : '';
}

function extractTables(content: string): string {
  const lines = content.split('\n');
  return lines.filter((l) => l.includes('|') && /^\|.*\|$/.test(l.trim())).join('\n');
}

function extractBulletLists(content: string): string {
  const lines = content.split('\n');
  return lines.filter((l) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l)).join('\n');
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : text.trim();
}

function compressFrontmatterDescription(frontmatter: string, level: CompressionLevel): string {
  const lines = frontmatter.split('\n');
  let inBlock = false;
  const result: string[] = [];

  for (const line of lines) {
    if (inBlock && /^\s/.test(line)) {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      const text = line.trim();
      if (!text) {
        result.push(line);
        continue;
      }
      const compressed = compressText(text, level).compressed;
      if (compressed.trim()) {
        result.push(indent + compressed);
      }
      continue;
    }

    if (inBlock && !/^\s/.test(line)) {
      inBlock = false;
    }

    const descMatch = line.match(/^(description:\s*)(.*)/);
    if (descMatch) {
      const prefix = descMatch[1];
      const value = descMatch[2];
      if (/^[>|][-+]?$/.test(value.trim())) {
        inBlock = true;
        result.push(line);
      } else if (value.trim()) {
        const compressed = compressText(value, level).compressed;
        result.push(prefix + compressed.trim());
      } else {
        result.push(line);
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
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

export function compressMarkdown(content: string, level: CompressionLevel): CompressionResult {
  const originalLen = content.length;

  if (level === 'off') {
    return { compressed: content, originalLen, compressedLen: originalLen, ratio: 0 };
  }

  const { frontmatter, body } = extractFrontmatter(content);

  const fences = extractCodeFences(body);
  const tables = extractTables(body);
  const lists = extractBulletLists(body);
  const preserved = [fences, tables, lists].filter(Boolean).join('\n\n');

  const sections = parseSections(body);
  const kept: string[] = [];

  for (const section of sections) {
    const heading = section.heading;
    const headingLevel = heading.match(/^#+/)?.[0]?.length ?? 1;
    const sectionBody = firstSentence(section.body.filter((l) => l.trim()).join(' '));

    if (level === 'ultra' || level === 'wenyan') {
      if (headingLevel <= 2 && sectionBody) {
        kept.push(`${heading}\n${sectionBody}`);
      } else {
        kept.push(heading);
      }
    } else if (sectionBody) {
      kept.push(`${heading}\n${sectionBody}`);
    } else {
      kept.push(heading);
    }
  }

  let summary: string;
  if (kept.length === 0) {
    summary = body;
  } else {
    summary = kept.join('\n\n');
  }

  const combined = [preserved, summary].filter(Boolean).join('\n\n');
  const compressedFrontmatter = frontmatter ? compressFrontmatterDescription(frontmatter, level) : '';
  const bodyResult = compressText(combined, level);
  const compressed = compressedFrontmatter
    ? `${compressedFrontmatter}\n\n${bodyResult.compressed}`
    : bodyResult.compressed;
  const compressedLen = compressed.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed, originalLen, compressedLen, ratio };
}
