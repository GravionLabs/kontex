import { detectContentType } from './detect-content-type.js';
import { compressText } from './compressors/text.js';
import type { CompressionLevel, CompressOptions, CompressionResult, ContentType } from './types.js';

const MAX_INPUT_LENGTH = 50000;

export function compress(content: string): CompressionResult;
export function compress(content: string, level: CompressionLevel): CompressionResult;
export function compress(content: string, options: CompressOptions): CompressionResult;
export function compress(content: string, arg2?: CompressionLevel | CompressOptions): CompressionResult {
  let level: CompressionLevel;
  let contentType: ContentType | undefined;
  if (arg2 === undefined) {
    level = 'full';
  } else if (typeof arg2 === 'string') {
    level = arg2 as CompressionLevel;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    const opts = arg2 as CompressOptions;
    level = opts.level ?? 'full';
    contentType = opts.contentType;
  } else {
    level = 'full';
  }

  const resolvedType = contentType ?? (contentType === undefined ? 'auto' : contentType);
  const type: ContentType = resolvedType === 'auto' ? detectContentType(content) : resolvedType;

  if (!content || content.trim().length === 0) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (level === 'off') {
    return { compressed: content, originalLen: content.length, compressedLen: content.length, ratio: 0 };
  }

  if (content.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`);
  }

  switch (type) {
    case 'text':
    case 'markdown':
    case 'json':
    case 'log':
    case 'diff':
    default:
      return compressText(content, level);
  }
}
