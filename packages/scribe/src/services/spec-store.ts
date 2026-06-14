import type { EmbeddingProvider } from '@gravionlabs/kontex-types';
import { globalCavemanMode, globalContextBudget } from '@gravionlabs/kontex-types';

import { compressToCaveman } from './compression.js';
import { listSpecFiles, loadSpecFile, searchSpecFiles } from './markdown-loader.js';
import { getPhaseContext, getPhaseContextFromDocuments } from './phase-scanner.js';
import type { ProjectRegistry } from './project-registry.js';
import { SpecServerError } from './rules.js';
import type {
  ContextEntry,
  ContextQueryOptions,
  ContextQueryResult,
  ReindexResult,
  SearchResult,
  SpecDirectory,
  SpecFileInfo,
  WorkflowPhase,
} from './spec-types.js';
import { contentHash, GLOBAL_CONTEXT_PATHS, summarizeContent } from './spec-types.js';
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

  async listSpecs(project: string | undefined, directory?: SpecDirectory): Promise<SpecFileInfo[]> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      return this.sqliteStore.listSpecs(context.name, directory);
    }

    return listSpecFiles(context.rootDir, directory);
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

  async teamsContext(project: string | undefined, topic?: string): Promise<string[]> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      const rows = this.sqliteStore.listRaw(context.name);
      return scanTeamsContextFromDocuments(rows, topic);
    }

    return scanTeamsContext(context.rootDir, topic);
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
      const versionsByPath = new Map(rows.map((row) => [row.relativePath, row.version]));
      entries = getPhaseContextFromDocuments(rows, phase).map((entry) => ({
        ...entry,
        version: versionsByPath.get(entry.relativePath) ?? contentHash(entry.content),
      }));
    } else {
      entries = (await getPhaseContext(context.rootDir, phase)).map((entry) => ({
        ...entry,
        version: contentHash(entry.content),
      }));
    }

    const totalMatched = entries.length;
    let resultEntries = entries.filter((entry) => knownVersions[entry.relativePath] !== entry.version);

    // Auto-compress based on phase + caveman mode (skip in summary mode — already condensed)
    if (mode !== 'summary') {
      const effectiveLevel = globalCavemanMode.getEffectiveLevel(phase);
      if (effectiveLevel !== 'off') {
        resultEntries = resultEntries.map((entry) => ({
          ...entry,
          content: compressToCaveman(entry.content, effectiveLevel).compressed,
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
    if (globalContextBudget.status === 'panic' && globalCavemanMode.level !== 'off') {
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

  private async ensureIndexed(projectName: string, rootDir: string): Promise<void> {
    if (!this.sqliteStore) {
      return;
    }

    await this.sqliteReady;
    await this.sqliteStore.reindexProject(projectName, rootDir);
  }
}
