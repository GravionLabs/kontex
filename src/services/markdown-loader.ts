import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { allowedExtensions, ensureAllowedRootPath, ensureAllowedSpecRelativePath, SpecServerError } from './rules.js';
import type { LoadedSpec, SearchResult, SpecDirectory, SpecFileInfo } from './spec-types.js';
import { getFileKind } from './spec-types.js';

const SPEC_DIRECTORIES: SpecDirectory[] = ['docs', 'specs'];

export async function listSpecFiles(rootDir: string, directory?: SpecDirectory): Promise<SpecFileInfo[]> {
  const directories = directory ? [directory] : SPEC_DIRECTORIES;
  const results: SpecFileInfo[] = [];

  for (const baseDirectory of directories) {
    const absoluteDirectory = path.join(rootDir, baseDirectory);
    await walkSpecDirectory(rootDir, absoluteDirectory, results);
  }

  return results.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function loadSpecFile(rootDir: string, relativePath: string): Promise<LoadedSpec> {
  const normalizedPath = ensureAllowedSpecRelativePath(relativePath);
  const absolutePath = ensureAllowedRootPath(rootDir, normalizedPath);
  await assertReadableFile(absolutePath);

  const content = await readFile(absolutePath, 'utf8');
  const stats = await stat(absolutePath);

  return {
    relativePath: normalizedPath,
    kind: getFileKind(normalizedPath),
    size: stats.size,
    updatedAt: stats.mtime.toISOString(),
    content,
  };
}

export async function searchSpecFiles(rootDir: string, query: string, limit = 5): Promise<SearchResult[]> {
  const files = await listSpecFiles(rootDir);
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const matches: SearchResult[] = [];

  for (const file of files) {
    const absolutePath = path.join(rootDir, file.relativePath);
    const content = await readFile(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lowered = line.toLowerCase();
      const found =
        terms.length === 0 ? lowered.includes(query.toLowerCase()) : terms.some((term) => lowered.includes(term));

      if (!found) {
        continue;
      }

      matches.push({
        relativePath: file.relativePath,
        lineNumber: index + 1,
        excerpt: lines
          .slice(index, Math.min(index + 3, lines.length))
          .map((entry) => entry.trim())
          .filter(Boolean)
          .join(' '),
      });

      if (matches.length >= limit) {
        return matches;
      }
    }
  }

  return matches;
}

async function walkSpecDirectory(rootDir: string, absoluteDirectory: string, results: SpecFileInfo[]): Promise<void> {
  try {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        await walkSpecDirectory(rootDir, absolutePath, results);
        continue;
      }

      if (!isAllowedSpecFile(relativePath)) {
        continue;
      }

      const stats = await stat(absolutePath);
      results.push({
        relativePath,
        kind: getFileKind(relativePath),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      });
    }
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return;
    }

    throw error;
  }
}

async function assertReadableFile(absolutePath: string): Promise<void> {
  try {
    await access(absolutePath);
  } catch {
    throw new SpecServerError('Spec file not found.');
  }
}

function isAllowedSpecFile(relativePath: string): boolean {
  const normalized = relativePath.toLowerCase();
  return (
    (normalized.startsWith('docs/') || normalized.startsWith('specs/')) &&
    allowedExtensions.some((extension) => normalized.endsWith(extension))
  );
}

function isMissingDirectoryError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}
