export type { CavemanLevel } from '@kontex/types';

export interface CompressionResult {
  compressed: string;
  originalLen: number;
  compressedLen: number;
  ratio: number;
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
