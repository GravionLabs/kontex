import path from 'node:path';

import { z } from 'zod';

export const specPathSchema = z
  .string()
  .min(1)
  .describe('Relative path under docs/ or specs/')
  .refine((value) => !value.includes('..'), 'Path traversal is not allowed')
  .refine((value) => value.startsWith('docs/') || value.startsWith('specs/'), 'Path must start with docs/ or specs/')
  .refine(
    (value) => allowedExtensions.some((extension) => value.toLowerCase().endsWith(extension)),
    'Unsupported file type',
  );

export const searchQuerySchema = z.string().trim().min(2).max(120);
export const projectSchema = z.string().trim().min(1).max(120).optional().describe('Optional project name');

export const allowedExtensions = ['.md', '.markdown', '.yaml', '.yml', '.json'] as const;

export class SpecServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecServerError';
  }
}

export function formatToolError(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : '';
  return {
    isError: true,
    content: [textContent(message ? `${fallbackMessage}: ${message}` : fallbackMessage)],
  };
}

export function textContent(text: string) {
  return { type: 'text' as const, text };
}

export function ensureAllowedRootPath(rootDir: string, relativePath: string): string {
  const normalized = ensureAllowedSpecRelativePath(relativePath);

  const absolutePath = path.resolve(rootDir, normalized);
  const normalizedRoot = path.resolve(rootDir);
  const rootPrefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : `${normalizedRoot}${path.sep}`;
  if (absolutePath !== normalizedRoot && !absolutePath.startsWith(rootPrefix)) {
    throw new SpecServerError('Resolved path escaped the project root.');
  }

  return absolutePath;
}

export function ensureAllowedSpecRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized.includes('/../')) {
    throw new SpecServerError('Path traversal is not allowed.');
  }

  if (!normalized.startsWith('docs/') && !normalized.startsWith('specs/')) {
    throw new SpecServerError('Only docs/ and specs/ paths are allowed.');
  }

  if (!allowedExtensions.some((extension) => normalized.toLowerCase().endsWith(extension))) {
    throw new SpecServerError('Unsupported file type.');
  }

  return normalized;
}
