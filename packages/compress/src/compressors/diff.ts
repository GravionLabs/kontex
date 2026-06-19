import type { CompressionLevel, CompressionResult } from '../types.js';

export function compressDiff(content: string, level: CompressionLevel): CompressionResult {
  const originalLen = content.length;

  if (!content.trim()) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (level === 'off') {
    return { compressed: content, originalLen, compressedLen: originalLen, ratio: 0 };
  }

  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++')) {
      result.push(line);
    } else if (line.startsWith('@@') && line.includes('@@')) {
      result.push(line);
    } else if (line.startsWith('+') || line.startsWith('-')) {
      result.push(line);
    } else if (line.startsWith(' ')) {
      if (level !== 'ultra' && level !== 'wenyan') {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  const compressed = result.join('\n');
  const compressedLen = compressed.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed, originalLen, compressedLen, ratio };
}
