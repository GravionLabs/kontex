import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { listSpecFiles } from './markdown-loader.js';

export async function scanTeamsContext(rootDir: string, topic?: string): Promise<string[]> {
  const files = await listSpecFiles(rootDir);
  const documents: Array<{ relativePath: string; content: string }> = [];

  for (const file of files) {
    const absolutePath = path.join(rootDir, file.relativePath);
    const content = await readFile(absolutePath, 'utf8');
    documents.push({ relativePath: file.relativePath, content });
  }

  return scanTeamsContextFromDocuments(documents, topic);
}

export function scanTeamsContextFromDocuments(
  documents: Array<{ relativePath: string; content: string }>,
  topic?: string,
): string[] {
  const keywords = buildKeywords(topic);
  const results: string[] = [];

  for (const file of documents) {
    const excerpt = extractRelevantExcerpt(file.content, keywords);

    if (excerpt) {
      results.push(`### ${file.relativePath}\n${excerpt}`);
    }
  }

  return results.slice(0, 5);
}

function buildKeywords(topic?: string): string[] {
  if (!topic) {
    return [];
  }

  return topic
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function extractRelevantExcerpt(content: string, keywords: string[]): string {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    const headingMatch =
      /^#{1,3}\s+/.test(line) && (lower.includes('team') || lower.includes('support') || lower.includes('context'));
    const keywordMatch = keywords.length > 0 && keywords.some((keyword) => lower.includes(keyword));

    if (!headingMatch && !keywordMatch) {
      continue;
    }

    const block = lines.slice(index, Math.min(index + 6, lines.length)).map((entry) => entry.trimEnd());
    return block.join('\n').trim();
  }

  return '';
}
