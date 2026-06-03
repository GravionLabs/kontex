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
