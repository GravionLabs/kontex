import { listSpecFiles, loadSpecFile, searchSpecFiles } from './markdown-loader.js';
import { getPhaseContext, getPhaseContextFromDocuments } from './phase-scanner.js';
import { ProjectRegistry } from './project-registry.js';
import { SpecServerError } from './rules.js';
import { scanTeamsContext, scanTeamsContextFromDocuments } from './teams-scanner.js';
import { SqliteSpecStore } from './sqlite-spec-store.js';
import type { ReindexResult, SearchResult, SpecDirectory, SpecFileInfo } from './spec-types.js';
import type { WorkflowPhase } from './spec-types.js';

export class SpecStore {
  private readonly sqliteStore: SqliteSpecStore | null;
  private readonly sqliteReady: Promise<void> | null;

  constructor(private readonly projectRegistry: ProjectRegistry) {
    if (projectRegistry.mode === 'sqlite') {
      this.sqliteStore = new SqliteSpecStore(projectRegistry.sqlitePath);
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

  async getContext(project: string | undefined, phase: WorkflowPhase): Promise<Array<{ relativePath: string; content: string }>> {
    const context = this.projectRegistry.resolveProjectRoot(project);
    if (this.sqliteStore) {
      await this.ensureIndexed(context.name, context.rootDir);
      const rows = this.sqliteStore.listRaw(context.name);
      return getPhaseContextFromDocuments(rows, phase);
    }

    return getPhaseContext(context.rootDir, phase);
  }

  async reindex(project?: string): Promise<ReindexResult[]> {
    if (!this.sqliteStore) {
      throw new SpecServerError('Reindex is only available when SPEC_SERVER_MODE=sqlite.');
    }

    const projectName = project?.trim();
    const targets = projectName ? [this.projectRegistry.resolveProjectRoot(projectName)] : this.projectRegistry.listProjects().map((name) => this.projectRegistry.resolveProjectRoot(name));

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
