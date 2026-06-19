import type { CompressionLevel } from '@gravionlabs/kontex-types';
export type { CompressionLevel } from '@gravionlabs/kontex-types';

export type ContentType = 'auto' | 'text' | 'markdown' | 'json' | 'log' | 'diff';

export interface CompressOptions {
  level?: CompressionLevel;
  contentType?: ContentType;
  maxTokens?: number;
}

export interface CompressionResult {
  compressed: string;
  originalLen: number;
  compressedLen: number;
  ratio: number;
  truncated?: boolean;
}

export type SegmentKind =
  | 'fence'
  | 'inline-code'
  | 'url'
  | 'function-call'
  | 'heading'
  | 'path'
  | 'date'
  | 'version'
  | 'const-case'
  | 'number'
  | 'identifier'
  | 'prose';

export interface Segment {
  kind: SegmentKind;
  text: string;
  preserved: boolean;
}
