import type { CompressionLevel, CompressionResult } from '../types.js';

const MAX_STRING_LENGTH = 50;
const TRUNCATED_SUFFIX = '…';

function truncateValue(value: unknown, level: CompressionLevel): unknown {
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return value.slice(0, 40) + TRUNCATED_SUFFIX;
    }
    return value;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => truncateValue(v, level));
    if (level === 'ultra' || level === 'wenyan') {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return items;
  }
  if (value !== null && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = truncateValue(v, level);
    }
    return obj;
  }
  return value;
}

export function compressJson(content: string, level: CompressionLevel): CompressionResult {
  const originalLen = content.length;

  if (!content.trim()) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (level === 'off') {
    return { compressed: content, originalLen, compressedLen: originalLen, ratio: 0 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { compressed: content, originalLen, compressedLen: originalLen, ratio: 0 };
  }

  const truncated = truncateValue(parsed, level);
  const compressed = JSON.stringify(truncated);
  const compressedLen = compressed.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed, originalLen, compressedLen, ratio };
}
