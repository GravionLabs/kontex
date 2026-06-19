import { detectContentType } from './detect-content-type.js';
import { compressText } from './compressors/text.js';
import { compressMarkdown } from './compressors/markdown.js';
import { compressJson } from './compressors/json.js';
import { compressLog } from './compressors/log.js';
import { compressDiff } from './compressors/diff.js';
import type { CompressionLevel, CompressOptions, CompressionResult, ContentType } from './types.js';

const MAX_INPUT_LENGTH = 50000;

export function compress(content: string): CompressionResult;
export function compress(content: string, level: CompressionLevel): CompressionResult;
export function compress(content: string, options: CompressOptions): CompressionResult;
export function compress(content: string, arg2?: CompressionLevel | CompressOptions): CompressionResult {
  let level: CompressionLevel;
  let contentType: ContentType | undefined;
  let maxTokens: number | undefined;
  if (arg2 === undefined) {
    level = 'full';
  } else if (typeof arg2 === 'string') {
    level = arg2 as CompressionLevel;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    const opts = arg2 as CompressOptions;
    level = opts.level ?? 'full';
    contentType = opts.contentType;
    maxTokens = opts.maxTokens;
  } else {
    level = 'full';
  }

  const resolvedType = contentType ?? (contentType === undefined ? 'auto' : contentType);
  const type: ContentType = resolvedType === 'auto' ? detectContentType(content) : resolvedType;

  if (!content || content.trim().length === 0) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  let result: CompressionResult;

  if (level === 'off') {
    result = { compressed: content, originalLen: content.length, compressedLen: content.length, ratio: 0 };
  } else {
    if (content.length > MAX_INPUT_LENGTH) {
      throw new Error(`Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`);
    }
    switch (type) {
      case 'text':
        result = compressText(content, level);
        break;
      case 'markdown':
        result = compressMarkdown(content, level);
        break;
      case 'json':
        result = compressJson(content, level);
        break;
      case 'log':
        result = compressLog(content, level);
        break;
      case 'diff':
        result = compressDiff(content, level);
        break;
      default:
        result = compressText(content, level);
    }
  }

  if (maxTokens !== undefined && maxTokens > 0) {
    const estimatedTokens = Math.ceil(result.compressed.length / 4);
    if (estimatedTokens > maxTokens) {
      const maxChars = maxTokens * 4;
      const truncated = truncateAtSentenceBoundary(result.compressed, maxChars);
      const compressedLen = truncated.length;
      const ratio = result.originalLen > 0 ? Math.round((1 - compressedLen / result.originalLen) * 100) : 0;
      return { compressed: truncated, originalLen: result.originalLen, compressedLen, ratio, truncated: true };
    }
  }

  return result;
}

function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n'),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('\n\n'),
  );

  if (lastBoundary > maxChars * 0.5) {
    return text.slice(0, lastBoundary + 1);
  }
  return text.slice(0, maxChars);
}
