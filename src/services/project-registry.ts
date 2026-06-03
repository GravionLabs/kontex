import path from 'node:path';

import { SpecServerError } from './rules.js';

export type StorageMode = 'filesystem' | 'sqlite';

export interface ProjectConfig {
  mode: StorageMode;
  defaultProject: string;
  sqlitePath: string;
}

export class ProjectRegistry {
  readonly mode: StorageMode;
  readonly defaultProject: string;
  readonly sqlitePath: string;
  private readonly projectRoots: Map<string, string>;

  constructor(rootDir = process.cwd()) {
    const config = loadProjectConfig(rootDir);
    this.mode = config.mode;
    this.defaultProject = config.defaultProject;
    this.sqlitePath = config.sqlitePath;
    this.projectRoots = buildProjectMap(rootDir, config.defaultProject);
  }

  resolveProjectName(project?: string): string {
    return (project?.trim() || this.defaultProject).toLowerCase();
  }

  resolveProjectRoot(project?: string): { name: string; rootDir: string } {
    const projectName = this.resolveProjectName(project);
    const rootDir = this.projectRoots.get(projectName);
    if (!rootDir) {
      throw new SpecServerError(`Unknown project "${projectName}". Configure SPEC_SERVER_PROJECTS to register it.`);
    }

    return { name: projectName, rootDir };
  }

  listProjects(): string[] {
    return Array.from(this.projectRoots.keys()).sort((left, right) => left.localeCompare(right));
  }
}

function loadProjectConfig(rootDir: string): ProjectConfig {
  const mode = process.env.SPEC_SERVER_MODE === 'sqlite' ? 'sqlite' : 'filesystem';
  const defaultProject = normalizeProjectName(
    process.env.SPEC_SERVER_DEFAULT_PROJECT || path.basename(path.resolve(rootDir)) || 'default',
  );
  const sqlitePath = resolvePossiblyRelative(
    rootDir,
    process.env.SPEC_SERVER_SQLITE_PATH || path.join('.kontex', 'specs.db'),
  );

  return { mode, defaultProject, sqlitePath };
}

function buildProjectMap(rootDir: string, defaultProject: string): Map<string, string> {
  const result = new Map<string, string>();
  result.set(defaultProject, path.resolve(rootDir));

  const rawMappings = process.env.SPEC_SERVER_PROJECTS;
  if (!rawMappings) {
    return result;
  }

  const entries = rawMappings
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [name, projectPath] = entry.split('=').map((part) => part?.trim());
    if (!name || !projectPath) {
      continue;
    }

    result.set(normalizeProjectName(name), resolvePossiblyRelative(rootDir, projectPath));
  }

  return result;
}

function resolvePossiblyRelative(rootDir: string, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

function normalizeProjectName(value: string): string {
  return value.trim().toLowerCase();
}
