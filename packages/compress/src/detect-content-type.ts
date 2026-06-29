import type { ContentType } from './types.js';

export function detectContentType(content: string): ContentType {
  if (!content || content.trim().length === 0) {
    return 'text';
  }

  if (isJson(content)) {
    return 'json';
  }

  if (isDiff(content)) {
    return 'diff';
  }

  if (isLog(content)) {
    return 'log';
  }

  if (isMarkdown(content)) {
    return 'markdown';
  }

  return 'text';
}

function isJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function isDiff(content: string): boolean {
  const lines = content.split('\n');
  let hasHunk = false;
  let hasFileHeader = false;
  for (const line of lines) {
    if (line.startsWith('@@') && line.includes('@@')) {
      hasHunk = true;
    }
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      hasFileHeader = true;
    }
  }
  return hasHunk && hasFileHeader;
}

function isLog(content: string): boolean {
  const lines = content.split('\n');
  let logLineCount = 0;
  for (const line of lines) {
    if (
      /\b(ERROR|FATAL|FAILED|TRACE|DEBUG|WARN(ING)?)\b/.test(line) ||
      /\[error\]|\[fatal\]|\[failed\]|\[warn(ing)?\]/i.test(line) ||
      line.includes('[INFO]') ||
      line.includes('[DEBUG]') ||
      line.includes('[TRACE]')
    ) {
      logLineCount++;
    }
  }
  return logLineCount >= Math.min(3, lines.length);
}

function isMarkdown(content: string): boolean {
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length === 0) return false;

  const headingLines = nonEmptyLines.filter((l) => /^#{1,6}\s/.test(l));
  if (headingLines.length > 0 && headingLines.length / nonEmptyLines.length > 0.05) {
    return true;
  }

  if (lines[0]?.trim() === '---' && content.includes('\n---')) {
    return true;
  }

  return false;
}
