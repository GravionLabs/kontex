import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { allowedExtensions, ensureAllowedRootPath, ensureAllowedSpecRelativePath, SpecServerError } from './rules.js';
import type { LoadedSpec, SearchResult, SpecDirectory, SpecFileInfo } from './spec-types.js';
import { getFileKind, parseFrontmatter } from './spec-types.js';

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
  const fm = parseFrontmatter(content);

  return {
    relativePath: normalizedPath,
    kind: getFileKind(normalizedPath),
    size: stats.size,
    updatedAt: stats.mtime.toISOString(),
    status: fm.status,
    owner: fm.owner,
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
      const matchingTerms =
        terms.length === 0
          ? query.toLowerCase() && lowered.includes(query.toLowerCase())
            ? 1
            : 0
          : terms.filter((term) => lowered.includes(term)).length;

      if (matchingTerms === 0) continue;

      matches.push({
        relativePath: file.relativePath,
        lineNumber: index + 1,
        excerpt: lines
          .slice(index, Math.min(index + 3, lines.length))
          .map((entry) => entry.trim())
          .filter(Boolean)
          .join(' '),
        score: matchingTerms,
      });
    }
  }

  return matches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
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
        status: 'draft',
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
