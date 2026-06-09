import type { Segment, SegmentKind } from './types.js';

interface Rule {
  kind: SegmentKind;
  priority: number;
  re: RegExp;
}

const RULES: Rule[] = [
  { kind: 'fence', priority: 100, re: /```[\s\S]*?```|~~~[\s\S]*?~~~/g },
  { kind: 'inline-code', priority: 90, re: /`[^`\n]+`/g },
  { kind: 'url', priority: 80, re: /\bhttps?:\/\/[^\s)\]]+/g },
  { kind: 'function-call', priority: 75, re: /\b[A-Za-z_]\w*\s*\([^)]*\)/g },
  { kind: 'heading', priority: 70, re: /^#{1,6}\s[^\n]*$/gm },
  {
    kind: 'path',
    priority: 65,
    re: /(?:(?:\.{1,2})?\/[A-Za-z0-9._\-/]+|~\/[A-Za-z0-9._\-/]+|[A-Z]:\\[A-Za-z0-9._\-\\]+)/g,
  },
  { kind: 'date', priority: 60, re: /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b/g },
  { kind: 'version', priority: 55, re: /\bv?\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?\b/g },
  { kind: 'const-case', priority: 50, re: /\b[A-Z][A-Z_0-9]{2,}\b/g },
  { kind: 'number', priority: 45, re: /\b\d+(?:\.\d+)?\b/g },
  {
    kind: 'identifier',
    priority: 40,
    re: /\b[A-Za-z_][A-Za-z0-9_]*[-_][A-Za-z0-9_-]+\b|\b[a-z]+[A-Z][A-Za-z0-9]*\b/g,
  },
];

interface Span {
  start: number;
  end: number;
  kind: SegmentKind;
  priority: number;
}

export function tokenize(input: string): Segment[] {
  const spans: Span[] = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m = rule.re.exec(input);
    while (m !== null) {
      if (m[0].length === 0) {
        rule.re.lastIndex += 1;
      } else {
        spans.push({
          start: m.index,
          end: m.index + m[0].length,
          kind: rule.kind,
          priority: rule.priority,
        });
      }
      m = rule.re.exec(input);
    }
  }
  spans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.end - a.end;
  });
  const resolved: Span[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    resolved.push(s);
    cursor = s.end;
  }
  resolved.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let pos = 0;
  for (const s of resolved) {
    if (s.start > pos) {
      out.push({ kind: 'prose', text: input.slice(pos, s.start), preserved: false });
    }
    out.push({ kind: s.kind, text: input.slice(s.start, s.end), preserved: true });
    pos = s.end;
  }
  if (pos < input.length) {
    out.push({ kind: 'prose', text: input.slice(pos), preserved: false });
  }
  return out;
}

export function detokenize(segments: Segment[]): string {
  return segments.map((s) => s.text).join('');
}
