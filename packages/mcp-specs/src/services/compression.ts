export type ArtifactKind = 'prompt' | 'skill' | 'agent';

export interface CompressionResult {
  compressed: string;
  originalLen: number;
  compressedLen: number;
  ratio: number;
}

// Caveman text compression rules
const FILLERS = /\b(?:just|really|basically|actually|simply|quite|very|essentially|literally)\b/gi;

const PLEASANTRIES = /\b(?:please|kindly|thank you|thanks|sure|certainly|of course|happy to|i'?d be happy)\b[,.]?\s*/gi;

const HEDGES =
  /\b(?:perhaps|maybe|might|could potentially|would like to|i think|in my opinion|it seems|it appears)\b\s*/gi;

const LEADERS = /^(?:i'?ll|i will|i can|i'd|you can|we will|we can|let me|let's)\s+/gim;

const ARTICLES = /\b(?:a|an|the)\s+(?=[a-z])/gi;

// Protected patterns that should not be modified by caveman compression
const PROTECTED_PATTERNS = [
  /```[\s\S]*?```/g, // fenced code
  /`[^`\n]+`/g, // inline code
  /\bhttps?:\/\/\S+/gi, // URLs
  /\b[\w.-]*[/\\][\w./-]+/g, // paths with / or \
  /\b[A-Z][A-Za-z0-9]*(?:_[A-Z][A-Za-z0-9]*)+\b/g, // CONST_CASE
  /\b\w+\.\w+(?:\.\w+)*\(\)?/g, // dotted.method or pkg.fn()
  /[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)/g, // function calls
  /\b\d+\.\d+\.\d+\b/g, // version numbers
];

function extractFrontmatter(content: string): { frontmatter: string; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: '', body: content };
  }

  const lines = content.split('\n');
  let endIdx = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    // Malformed: opening --- but no closing. Treat as no frontmatter.
    return { frontmatter: '', body: content };
  }

  const frontmatter = lines.slice(0, endIdx + 1).join('\n');
  const body = lines.slice(endIdx + 1).join('\n');

  return { frontmatter, body };
}

export function compressToCaveman(content: string): CompressionResult {
  if (!content || content.trim().length === 0) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (content.length > 50000) {
    throw new Error('Input exceeds maximum length of 50000 characters.');
  }

  const { frontmatter, body } = extractFrontmatter(content);

  // Extract protected regions
  const protected_regions: string[] = [];
  let working = body;

  for (const pattern of PROTECTED_PATTERNS) {
    working = working.replace(pattern, (match) => {
      protected_regions.push(match);
      return `__PROTECTED_${protected_regions.length - 1}__`;
    });
  }

  // Apply caveman rules in order (largest sets first)
  let compressed = working;
  compressed = compressed.replace(PLEASANTRIES, '');
  compressed = compressed.replace(HEDGES, '');
  compressed = compressed.replace(FILLERS, '');
  compressed = compressed.replace(LEADERS, '');
  compressed = compressed.replace(ARTICLES, '');

  // Restore protected regions
  for (let i = 0; i < protected_regions.length; i++) {
    compressed = compressed.replace(`__PROTECTED_${i}__`, protected_regions[i]);
  }

  // Collapse excess whitespace and clean punctuation
  compressed = compressed
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();

  // Clean up punctuation left behind
  compressed = compressed
    .replace(/^\s*[,;.]\s*/gm, '') // leading punctuation
    .replace(/\s+[,;]/g, ',') // duplicate punctuation
    .replace(/,\s*,/g, ',') // consecutive commas
    .replace(/(\w)\s+\./, '$1.'); // space before period

  // Reassemble with frontmatter if present
  const final = frontmatter ? `${frontmatter}\n${compressed}` : compressed;

  const originalLen = content.length;
  const compressedLen = final.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed: final, originalLen, compressedLen, ratio };
}

export function compressArtifact(kind: ArtifactKind, content: string): CompressionResult {
  if (!content || content.trim().length === 0) {
    return { compressed: '', originalLen: 0, compressedLen: 0, ratio: 0 };
  }

  if (content.length > 50000) {
    throw new Error('Input exceeds maximum length of 50000 characters.');
  }

  const { frontmatter, body } = extractFrontmatter(content);
  const compressedBody = compressText(kind, body);
  const compressed = frontmatter ? `${frontmatter}\n${compressedBody}` : compressedBody;

  const originalLen = content.length;
  const compressedLen = compressed.length;
  const ratio = originalLen > 0 ? Math.round((1 - compressedLen / originalLen) * 100) : 0;

  return { compressed, originalLen, compressedLen, ratio };
}

function compressText(kind: ArtifactKind, text: string): string {
  let result = text;

  // drop filler words
  result = dropFiller(result);

  // compress generic prose
  result = compressGenericProse(result);

  // kind-specific rules
  if (kind === 'prompt') {
    result = compressPrompt(result);
  } else if (kind === 'skill') {
    result = compressSkill(result);
  } else if (kind === 'agent') {
    result = compressAgent(result);
  }

  // collapse excess whitespace
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();

  // clean up punctuation left behind
  result = result
    .replace(/^\s*[,;.]\s*/gm, '') // leading punctuation
    .replace(/\s+[,;]/g, ',') // duplicate punctuation
    .replace(/,\s*,/g, ',') // consecutive commas
    .replace(/(\w)\s+\./, '$1.'); // space before period

  return result.trim();
}

function dropFiller(text: string): string {
  const filler = [
    /\bPlease\b/g,
    /\b(just|really|basically|actually|simply|clearly|obviously|certainly|sure|happy to|would be|like|essentially|very|quite|rather|somewhat)\b/gi,
    /\b(it is|it's) (important|crucial|essential) (to|that)/gi,
    /\b(the fact that)\b/gi,
    /\b(in order to)\b/g,
    /\b(as a matter of fact)\b/gi,
    /\bthank you\b/gi,
  ];

  let result = text;
  for (const pattern of filler) {
    result = result.replace(pattern, '');
  }

  return result;
}

function compressGenericProse(text: string): string {
  const replacements: [RegExp, string][] = [
    // articles first, before other replacements
    [/\b(a|an|the)\s+/gi, ''],
    // long synonyms → short
    [/\binformation\b/gi, 'info'],
    [/\bfunctionality\b/gi, 'function'],
    [/\bimplementation\b/gi, 'impl'],
    [/\bconfiguration\b/gi, 'config'],
    [/\brequest\b/gi, 'req'],
    [/\bresponse\b/gi, 'res'],
    [/\bdatabase\b/gi, 'DB'],
    [/\bauthentication\b/gi, 'auth'],
    [/\bauthorization\b/gi, 'authz'],
    [/\bvariable\b/gi, 'var'],
    [/\bparameter\b/gi, 'param'],
    [/\bargument\b/gi, 'arg'],
    [/\bfunction\b/gi, 'fn'],
    [/\bapplication\b/gi, 'app'],
    [/\bframework\b/gi, 'fw'],
    [/\blibrary\b/gi, 'lib'],
    [/\breturns?\b/gi, '→'],
    [/\bcaused? by\b/gi, '←'],
    [/\bdue to\b/gi, '←'],
    [/\bif you\b/gi, 'if'],
    [/\byou should\b/gi, 'should'],
    [/\byou must\b/gi, 'must'],
    [/\byou can\b/gi, 'can'],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function compressPrompt(text: string): string {
  // prompts compress well by dropping instructions about tone/length
  const patterns = [
    /Please\s+/gi,
    /thank you/gi,
    /\b(be|stay|remain)\s+(brief|concise|short|clear)\b/gi,
    /\b(in\s+)?(simple|plain|clear)\s+language\b/gi,
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

function compressSkill(text: string): string {
  // skills compress by shortening metadata headers
  const patterns = [/^###\s+/gm];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '## ');
  }

  return result;
}

function compressAgent(text: string): string {
  // agents: drop verbose agent name/role patterns
  const patterns = [/You are an? (AI|agent|assistant)\s+/gi, /Your role is to/gi, /You should\s+/gi];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}
