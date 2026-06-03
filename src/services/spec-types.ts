import { createHash } from 'node:crypto';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

export type SpecType = 'api' | 'domain' | 'workflow' | 'validation' | 'event' | 'rule';
export type SpecDirectory = 'docs' | 'specs';
export type WorkflowPhase = 'analysis' | 'planning' | 'implementation' | 'testing' | 'verification';

export const WORKFLOW_PHASES: WorkflowPhase[] = ['analysis', 'planning', 'implementation', 'testing', 'verification'];

export const GLOBAL_CONTEXT_PATHS: string[] = ['specs/architecture/rules.md', 'docs/conventions.md'];

export const PHASE_SPEC_DIRS: Record<WorkflowPhase, string[]> = {
  analysis: ['specs/architecture', 'specs/domain'],
  planning: ['specs/architecture', 'specs/domain', 'specs/api'],
  implementation: ['specs/architecture', 'specs/api', 'specs/validation', 'specs/workflows'],
  testing: ['specs/validation', 'specs/workflows'],
  verification: ['specs/domain', 'specs/validation'],
};

export function phaseContextPath(phase: WorkflowPhase): string {
  return `specs/phases/${phase}.md`;
}

export interface SpecFileInfo {
  relativePath: string;
  kind: string;
  size: number;
  updatedAt: string;
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

export function getFileKind(relativePath: string): string {
  return path.extname(relativePath).slice(1) || 'text';
}

export function contentHash(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
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
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      paragraph = line;
      break;
    }
  }

  const stripped = stripMarkdownDecorators(paragraph);

  const parts: string[] = [];
  if (heading) parts.push(`# ${heading}`);
  if (stripped) parts.push(stripped.slice(0, 120));

  return parts.join('\n\n') || raw.slice(0, 120);
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
