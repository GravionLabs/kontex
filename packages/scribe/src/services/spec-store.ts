import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { EmbeddingProvider } from '@gravionlabs/kontex-types';
import { globalCompressionMode, globalContextBudget } from '@gravionlabs/kontex-types';

import { compress } from './compression.js';
import { listSpecFiles, loadSpecFile, searchSpecFiles } from './markdown-loader.js';
import { getPhaseContext, getPhaseContextFromDocuments } from './phase-scanner.js';
import type { ProjectRegistry } from './project-registry.js';
import { ensureAllowedSpecRelativePath, SpecServerError } from './rules.js';
import type {
  ContextEntry,
  ContextQueryOptions,
  ContextQueryResult,
  ReindexResult,
  SearchResult,
  SpecDirectory,
  SpecFileInfo,
  SpecStatus,
  WorkflowPhase,
} from './spec-types.js';
import { contentHash, GLOBAL_CONTEXT_PATHS, parseFrontmatter, summarizeContent } from './spec-types.js';
import { SqliteSpecStore } from './sqlite-spec-store.js';
import { scanTeamsContext, scanTeamsContextFromDocuments } from './teams-scanner.js';

export class SpecStore {
  private readonly sqliteStore: SqliteSpecStore | null;
  private readonly sqliteReady: Promise<void> | null;

  constructor(
    private readonly projectRegistry: ProjectRegistry,
    private readonly embeddingProvider?: EmbeddingProvider,
  ) {
    if (projectRegistry.mode === 'sqlite') {
      this.sqliteStore = new SqliteSpecStore(projectRegistry.sqlitePath, embeddingProvider);
      this.sqliteReady = this.sqliteStore.ensureParentDirectory();
      return;
    }

    this.sqliteStore = null;
    this.sqliteReady = null;
  }

  get defaultProject(): string {
    return this.projectRegistry.defaultProject;
  }

  get mode(): 'filesystem' | 'sqlite' {
    return this.projectRegistry.mode;
  }

  listProjects(): string[] {
    return this.projectRegistry.listProjects();
  }

  async listSpecs(
    project: string | undefined,
    directory?: SpecDirectory,
    status?: SpecStatus,
  ): Promise<SpecFileInfo[]> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      return this.sqliteStore.listSpecs(context.name, directory, status);
    }

    // Filesystem mode: status is always 'draft'; skip filter
    const files = await listSpecFiles(context.rootDir, directory);
    return status ? files.filter((f) => f.status === status) : files;
  }

  async loadSpec(project: string | undefined, relativePath: string) {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      return this.sqliteStore.loadSpec(context.name, relativePath);
    }

    return loadSpecFile(context.rootDir, relativePath);
  }

  async searchSpecs(project: string | undefined, query: string, limit: number): Promise<SearchResult[]> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      return this.sqliteStore.searchSpecs(context.name, query, limit);
    }

    return searchSpecFiles(context.rootDir, query, limit);
  }

  async teamsContext(project: string | undefined, topic?: string, limit = 5): Promise<string[]> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      const rows = this.sqliteStore.listRaw(context.name);
      return scanTeamsContextFromDocuments(rows, topic, limit);
    }

    return scanTeamsContext(context.rootDir, topic, limit);
  }

  async getContext(
    project: string | undefined,
    phase: WorkflowPhase,
    options: ContextQueryOptions = {},
  ): Promise<ContextQueryResult> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    const { knownVersions = {}, mode = 'full' } = options;

    let entries: ContextEntry[];
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      const rows = this.sqliteStore.listRaw(context.name);
      const nonDeprecated = rows.filter((row) => row.status !== 'deprecated');
      const versionsByPath = new Map(nonDeprecated.map((row) => [row.relativePath, row.version]));
      entries = getPhaseContextFromDocuments(nonDeprecated, phase).map((entry) => ({
        ...entry,
        version: versionsByPath.get(entry.relativePath) ?? contentHash(entry.content),
        status: (rows.find((r) => r.relativePath === entry.relativePath)?.status ?? 'draft') as SpecStatus,
      }));
    } else {
      const rawEntries = await getPhaseContext(context.rootDir, phase);
      entries = rawEntries
        .filter((entry) => parseFrontmatter(entry.content).status !== 'deprecated')
        .map((entry) => ({
          ...entry,
          version: contentHash(entry.content),
          status: parseFrontmatter(entry.content).status,
        }));
    }

    const totalMatched = entries.length;
    let resultEntries = entries.filter((entry) => knownVersions[entry.relativePath] !== entry.version);

    // Auto-compress based on phase + caveman mode (skip in summary mode — already condensed)
    if (mode !== 'summary') {
      const effectiveLevel = globalCompressionMode.getEffectiveLevel(phase);
      if (effectiveLevel !== 'off') {
        resultEntries = resultEntries.map((entry) => ({
          ...entry,
          content: compress(entry.content, effectiveLevel).compressed,
        }));
      }
    }

    // Summary mode: heading + first 120 chars (non-global files only)
    if (mode === 'summary') {
      const globalPathSet = new Set(GLOBAL_CONTEXT_PATHS);
      resultEntries = resultEntries.map((entry) => ({
        ...entry,
        content: globalPathSet.has(entry.relativePath) ? entry.content : summarizeContent(entry.content),
      }));
    }

    // Budget panic: drop non-global files when compression is active
    if (globalContextBudget.status === 'panic' && globalCompressionMode.level !== 'off') {
      const globalPathSet = new Set(GLOBAL_CONTEXT_PATHS);
      resultEntries = resultEntries.filter((e) => globalPathSet.has(e.relativePath));
    }

    return { entries: resultEntries, totalMatched };
  }

  async reindex(project?: string): Promise<ReindexResult[]> {
    if (!this.sqliteStore) {
      throw new SpecServerError('Reindex is only available when SPEC_SERVER_MODE=sqlite.');
    }

    const projectName = project?.trim();
    const targets = projectName
      ? [this.projectRegistry.resolveProjectRoot(projectName)]
      : this.projectRegistry.listProjects().map((name) => this.projectRegistry.resolveProjectRoot(name));

    const results: ReindexResult[] = [];
    for (const target of targets) {
      results.push(await this.sqliteStore.reindexProject(target.name, target.rootDir));
    }

    return results;
  }

  async writeSpec(
    project: string | undefined,
    relativePath: string,
    content: string,
  ): Promise<{ version: string; absolutePath: string }> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    const safePath = ensureAllowedSpecRelativePath(relativePath);
    const absolutePath = path.resolve(context.rootDir, safePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');

    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
    }

    return { version: contentHash(content), absolutePath };
  }

  private async ensureIndexed(projectName: string, rootDir: string): Promise<void> {
    if (!this.sqliteStore) {
      return;
    }

    await this.sqliteReady;
    await this.sqliteStore.reindexProject(projectName, rootDir);
  }
}
