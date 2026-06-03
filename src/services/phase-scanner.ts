import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { allowedExtensions, ensureAllowedRootPath } from './rules.js';
import { GLOBAL_CONTEXT_PATHS, PHASE_SPEC_DIRS, phaseContextPath, type WorkflowPhase } from './spec-types.js';

export interface PhaseContextEntry {
  relativePath: string;
  content: string;
}

export async function getPhaseContext(rootDir: string, phase: WorkflowPhase): Promise<PhaseContextEntry[]> {
  const results: PhaseContextEntry[] = [];

  for (const globalPath of GLOBAL_CONTEXT_PATHS) {
    const entry = await tryLoadFile(rootDir, globalPath);
    if (entry) {
      results.push(entry);
    }
  }

  const phasePath = phaseContextPath(phase);
  const phaseEntry = await tryLoadFile(rootDir, phasePath);
  if (phaseEntry) {
    results.push(phaseEntry);
  }

  for (const dir of PHASE_SPEC_DIRS[phase]) {
    const dirEntries = await loadDirectory(rootDir, dir);
    for (const entry of dirEntries) {
      if (results.some((existing) => existing.relativePath === entry.relativePath)) {
        continue;
      }

      results.push(entry);
    }
  }

  return results;
}

export function getPhaseContextFromDocuments(
  documents: Array<{ relativePath: string; content: string }>,
  phase: WorkflowPhase,
): PhaseContextEntry[] {
  const results: PhaseContextEntry[] = [];
  const seen = new Set<string>();

  const globalPaths = new Set(GLOBAL_CONTEXT_PATHS);
  const phasePath = phaseContextPath(phase);
  const phaseDirs = new Set(PHASE_SPEC_DIRS[phase].map((dir) => dir.toLowerCase()));

  for (const doc of documents) {
    const lower = doc.relativePath.toLowerCase();
    const isGlobal = globalPaths.has(doc.relativePath);
    const isPhaseDoc = doc.relativePath === phasePath;
    const isInPhaseDir = [...phaseDirs].some((dir) => lower.startsWith(`${dir}/`));

    if ((isGlobal || isPhaseDoc || isInPhaseDir) && !seen.has(doc.relativePath)) {
      seen.add(doc.relativePath);
      results.push({ relativePath: doc.relativePath, content: doc.content });
    }
  }

  const order = (entry: PhaseContextEntry): number => {
    if (GLOBAL_CONTEXT_PATHS.includes(entry.relativePath)) return 0;
    if (entry.relativePath === phasePath) return 1;
    return 2;
  };

  return results.sort((a, b) => order(a) - order(b) || a.relativePath.localeCompare(b.relativePath));
}

async function tryLoadFile(rootDir: string, relativePath: string): Promise<PhaseContextEntry | null> {
  try {
    const absolutePath = ensureAllowedRootPath(rootDir, relativePath);
    await access(absolutePath);
    const content = await readFile(absolutePath, 'utf8');
    return { relativePath, content };
  } catch {
    return null;
  }
}

async function loadDirectory(rootDir: string, dirRelativePath: string): Promise<PhaseContextEntry[]> {
  const results: PhaseContextEntry[] = [];
  const absoluteDir = path.join(rootDir, dirRelativePath);

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        continue;
      }

      const relativePath = `${dirRelativePath}/${entry.name}`.replace(/\\/g, '/');
      const lower = relativePath.toLowerCase();

      if (!allowedExtensions.some((ext) => lower.endsWith(ext))) {
        continue;
      }

      const absolutePath = path.join(absoluteDir, entry.name);
      try {
        const fileStat = await stat(absolutePath);
        if (!fileStat.isFile()) {
          continue;
        }

        const content = await readFile(absolutePath, 'utf8');
        results.push({ relativePath, content });
      } catch {}
    }
  } catch {
    // Directory does not exist — that's fine
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
