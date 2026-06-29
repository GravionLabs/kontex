import { createHash } from 'node:crypto';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

export type SpecType = 'api' | 'domain' | 'workflow' | 'validation' | 'event' | 'rule' | 'deploy';
export type SpecDirectory = 'docs' | 'specs';
export type WorkflowPhase = 'analysis' | 'planning' | 'implementation' | 'testing' | 'verification' | 'deploy';
export type ContextMode = 'full' | 'summary';
export type SpecStatus = 'draft' | 'approved' | 'deprecated';

export interface SpecFrontmatter {
  status: SpecStatus;
  owner?: string;
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  'analysis',
  'planning',
  'implementation',
  'testing',
  'verification',
  'deploy',
];

export const GLOBAL_CONTEXT_PATHS: string[] = ['specs/architecture/rules.md', 'docs/conventions.md'];

export const PHASE_SPEC_DIRS: Record<WorkflowPhase, string[]> = {
  analysis: ['specs/architecture', 'specs/domain'],
  planning: ['specs/architecture', 'specs/domain', 'specs/api'],
  implementation: ['specs/architecture', 'specs/api', 'specs/validation', 'specs/workflows'],
  testing: ['specs/validation', 'specs/workflows'],
  verification: ['specs/domain', 'specs/validation'],
  deploy: ['specs/architecture', 'specs/deploy', 'specs/validation'],
};

export function phaseContextPath(phase: WorkflowPhase): string {
  return `specs/phases/${phase}.md`;
}

export interface SpecFileInfo {
  relativePath: string;
  kind: string;
  size: number;
  updatedAt: string;
  status: SpecStatus;
  owner?: string;
}

export interface LoadedSpec extends SpecFileInfo {
  content: string;
}

export interface SearchResult {
  relativePath: string;
  lineNumber: number;
  excerpt: string;
  score?: number;
}

export interface ReindexResult {
  project: string;
  indexed: number;
  updated: number;
  deleted: number;
  skipped: number;
}

export interface ContextEntry {
  relativePath: string;
  content: string;
  version: string;
  status?: SpecStatus;
}

export interface ContextQueryOptions {
  mode?: ContextMode;
  knownVersions?: Record<string, string>;
}

export interface ContextQueryResult {
  entries: ContextEntry[];
  totalMatched: number;
}

export function getFileKind(relativePath: string): string {
  return path.extname(relativePath).slice(1) || 'text';
}

export function contentHash(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

const VALID_STATUSES: readonly SpecStatus[] = ['draft', 'approved', 'deprecated'];

export function parseFrontmatter(raw: string): SpecFrontmatter {
  try {
    if (!raw.startsWith('---\n')) {
      return { status: 'draft' };
    }
    const closeIdx = raw.indexOf('\n---', 4);
    if (closeIdx === -1) {
      return { status: 'draft' };
    }
    const yamlBlock = raw.slice(4, closeIdx);
    const parsed = parseYaml(yamlBlock) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { status: 'draft' };
    }
    const rawStatus = parsed.status;
    const status: SpecStatus = VALID_STATUSES.includes(rawStatus as SpecStatus) ? (rawStatus as SpecStatus) : 'draft';
    const owner = typeof parsed.owner === 'string' ? parsed.owner : undefined;
    return { status, owner };
  } catch {
    return { status: 'draft' };
  }
}

export function detectSpecType(relativePath: string, raw: string): SpecType {
  const lowerPath = relativePath.toLowerCase();

  if (lowerPath.includes('workflow')) {
    return 'workflow';
  }
  if (lowerPath.includes('validation')) {
    return 'validation';
  }
  if (lowerPath.includes('event')) {
    return 'event';
  }
  if (lowerPath.includes('domain')) {
    return 'domain';
  }
  if (lowerPath.includes('rule')) {
    return 'rule';
  }

  if (lowerPath.includes('deploy') || lowerPath.includes('runbook') || lowerPath.includes('infra')) {
    return 'deploy';
  }

  if (
    lowerPath.includes('api') ||
    lowerPath.includes('endpoint') ||
    lowerPath.endsWith('.yaml') ||
    lowerPath.endsWith('.yml')
  ) {
    return 'api';
  }

  const lowerContent = raw.toLowerCase();
  if (lowerContent.includes('workflow')) {
    return 'workflow';
  }
  if (lowerContent.includes('validation')) {
    return 'validation';
  }
  if (lowerContent.includes('event')) {
    return 'event';
  }
  if (lowerContent.includes('domain')) {
    return 'domain';
  }
  if (lowerContent.includes('rule')) {
    return 'rule';
  }

  if (lowerContent.includes('runbook') || lowerContent.includes('deployment')) {
    return 'deploy';
  }

  return 'api';
}

export function summarizeContent(raw: string): string {
  const lines = raw.split('\n');

  let heading = '';
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      heading = lines[i].replace(/^#{1,2}\s+/, '').trim();
      headingIdx = i;
      break;
    }
  }

  let paragraph = '';
  const startIdx = headingIdx >= 0 ? headingIdx + 1 : 0;
  if (!looksLikeStructuredContent(raw)) {
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        paragraph = line;
        break;
      }
    }
  }

  const stripped = stripMarkdownDecorators(paragraph);

  const parts: string[] = [];
  if (heading) parts.push(`# ${heading}`);
  if (stripped) parts.push(stripped.slice(0, 120));

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  const structuredSummary = summarizeStructuredContent(raw);
  return structuredSummary ?? raw.slice(0, 120);
}

function stripMarkdownDecorators(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function summarizeStructuredContent(raw: string): string | null {
  const parsed = parseInlineStructuredContent(raw);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const heading = firstStructuredString(record, ['title', 'name', 'endpoint', 'path', 'id']);
  const paragraph = firstStructuredString(record, ['summary', 'description', 'purpose', 'rule', 'endpoint', 'path']);

  const parts: string[] = [];
  if (heading) {
    parts.push(`# ${heading}`);
  }

  if (paragraph && paragraph !== heading) {
    parts.push(stripMarkdownDecorators(paragraph).slice(0, 120));
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

function looksLikeStructuredContent(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return true;
  }

  const firstLine = trimmed.split('\n', 1)[0]?.trim() ?? '';
  return /^[A-Za-z0-9_.-]+:\s*\S/.test(firstLine);
}

function parseInlineStructuredContent(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!trimmed.includes(':')) {
    return null;
  }

  try {
    return parseYaml(trimmed);
  } catch {
    return null;
  }
}

function firstStructuredString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function toNormalizedContent(relativePath: string, raw: string): string {
  const structured = parseStructuredContent(relativePath, raw);
  return JSON.stringify(structured);
}

function parseStructuredContent(relativePath: string, raw: string): unknown {
  const lowerPath = relativePath.toLowerCase();

  if (lowerPath.endsWith('.json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return { format: 'json', text: raw };
    }
  }

  if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) {
    try {
      return parseYaml(raw);
    } catch {
      return { format: 'yaml', text: raw };
    }
  }

  return {
    format: 'markdown',
    text: raw,
  };
}
