import type { CompressionLevel, CompressionResult } from '../types.js';

function isErrorLine(line: string): boolean {
  return (
    /\b(error|fail|fatal|warn|exception|assert|FAILED|ERROR|FATAL|WARN|TRACE)\b/i.test(line) ||
    /\b(?:at\s+|stack\s+trace|→|->)\b/i.test(line)
  );
}

function isPassingLine(line: string, level: CompressionLevel): boolean {
  if (level !== 'ultra' && level !== 'wenyan') return false;
  return /\b(pass|ok|✓|✔|success)\b/i.test(line);
}

export function compressLog(content: string, level: CompressionLevel): CompressionResult {
  const originalLen = content.length;

  if (!content.trim()) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (level === 'off') {
    return { compressed: content, originalLen, compressedLen: originalLen, ratio: 0 };
  }

  const lines = content.split('\n');
  const result: string[] = [];
  let repeatCount = 0;
  let lastLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isPassingLine(line, level)) {
      continue;
    }

    if (line === lastLine) {
      repeatCount++;
      continue;
    }

    if (repeatCount > 0) {
      if (repeatCount > 2) {
        result[result.length - 1] = `${lastLine} <repeated ${repeatCount + 1} times>`;
      } else {
        for (let j = 0; j <= repeatCount; j++) {
          result.push(lastLine);
        }
      }
      repeatCount = 0;
    }

    result.push(line);
    lastLine = line;
  }

  if (repeatCount > 0) {
    if (repeatCount > 2) {
      result[result.length - 1] = `${lastLine} <repeated ${repeatCount + 1} times>`;
    } else {
      for (let j = 0; j <= repeatCount; j++) {
        result.push(lastLine);
      }
    }
  }

  const keepFirst = 3;
  const keepLast = 3;

  const errorIndices = result.map((l, i) => (isErrorLine(l) ? i : -1)).filter((i) => i >= 0);

  if (errorIndices.length > 0) {
    const filtered = result.filter((_, i) => {
      if (i < keepFirst) return true;
      if (i >= result.length - keepLast) return true;
      if (isErrorLine(result[i])) return true;
      return false;
    });
    const compressed = filtered.join('\n');
    const compressedLen = compressed.length;
    const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;
    return { compressed, originalLen, compressedLen, ratio };
  }

  const compressed = result.join('\n');
  const compressedLen = compressed.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed, originalLen, compressedLen, ratio };
}
