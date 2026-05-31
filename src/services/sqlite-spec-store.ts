import { mkdirSync } from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { listSpecFiles, loadSpecFile } from './markdown-loader.js';
import { ensureAllowedSpecRelativePath, SpecServerError } from './rules.js';
import {
  contentHash,
  detectSpecType,
  getFileKind,
  ReindexResult,
  SearchResult,
  SpecDirectory,
  SpecFileInfo,
  toNormalizedContent,
  resolveSpecVersion,
} from './spec-types.js';

interface StoredSpecRow {
  path: string;
  raw: string;
  updated_at: string;
}

export class SqliteSpecStore {
  private readonly db: Database.Database;

  constructor(private readonly dbPath: string) {
    mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  async ensureParentDirectory(): Promise<void> {
    mkdirSync(path.dirname(this.dbPath), { recursive: true });
  }

  async reindexProject(project: string, rootDir: string): Promise<ReindexResult> {
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO projects (name, updated_at) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at').run(project, now);

    const files = await listSpecFiles(rootDir);
    const readHash = this.db.prepare('SELECT content_hash FROM index_state WHERE project = ? AND path = ?');
    const upsertSpec = this.db.prepare(`
      INSERT INTO specs (project, type, version, path, content, raw, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project, path) DO UPDATE SET
        type = excluded.type,
        version = excluded.version,
        content = excluded.content,
        raw = excluded.raw,
        updated_at = excluded.updated_at
    `);
    const upsertState = this.db.prepare(`
      INSERT INTO index_state (project, path, content_hash, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project, path) DO UPDATE SET
        content_hash = excluded.content_hash,
        updated_at = excluded.updated_at
    `);
    const deleteSpec = this.db.prepare('DELETE FROM specs WHERE project = ? AND path = ?');
    const deleteState = this.db.prepare('DELETE FROM index_state WHERE project = ? AND path = ?');
    const knownPaths = this.db.prepare('SELECT path FROM index_state WHERE project = ?').all(project) as Array<{ path: string }>;
    const seenPaths = new Set<string>();

    let updated = 0;
    let skipped = 0;
    for (const file of files) {
      const loaded = await loadSpecFile(rootDir, file.relativePath);
      const hash = contentHash(loaded.content);
      const previous = readHash.get(project, loaded.relativePath) as { content_hash: string } | undefined;
      seenPaths.add(loaded.relativePath);

      if (previous?.content_hash === hash) {
        skipped += 1;
        continue;
      }

      const type = detectSpecType(loaded.relativePath, loaded.content);
      const version = resolveSpecVersion(loaded.relativePath, loaded.content, hash);
      const normalizedContent = toNormalizedContent(loaded.relativePath, loaded.content);
      upsertSpec.run(project, type, version, loaded.relativePath, normalizedContent, loaded.content, loaded.updatedAt);
      upsertState.run(project, loaded.relativePath, hash, now);
      updated += 1;
    }

    let deleted = 0;
    for (const entry of knownPaths) {
      if (seenPaths.has(entry.path)) {
        continue;
      }

      deleteSpec.run(project, entry.path);
      deleteState.run(project, entry.path);
      deleted += 1;
    }

    this.db.prepare('UPDATE projects SET updated_at = ? WHERE name = ?').run(now, project);

    return {
      project,
      indexed: files.length,
      updated,
      deleted,
      skipped,
    };
  }

  listSpecs(project: string, directory?: SpecDirectory): SpecFileInfo[] {
    const rows = directory
      ? (this.db
          .prepare('SELECT path, raw, updated_at FROM specs WHERE project = ? AND path LIKE ? ORDER BY path')
          .all(project, `${directory}/%`) as StoredSpecRow[])
      : (this.db.prepare('SELECT path, raw, updated_at FROM specs WHERE project = ? ORDER BY path').all(project) as StoredSpecRow[]);

    return rows.map((row) => ({
      relativePath: row.path,
      kind: getFileKind(row.path),
      size: Buffer.byteLength(row.raw, 'utf8'),
      updatedAt: row.updated_at,
    }));
  }

  loadSpec(project: string, relativePath: string): SpecFileInfo & { content: string } {
    const normalizedPath = ensureAllowedSpecRelativePath(relativePath);
    const row = this.db
      .prepare('SELECT path, raw, updated_at FROM specs WHERE project = ? AND path = ?')
      .get(project, normalizedPath) as StoredSpecRow | undefined;

    if (!row) {
      throw new SpecServerError('Spec file not found.');
    }

    return {
      relativePath: row.path,
      kind: getFileKind(row.path),
      size: Buffer.byteLength(row.raw, 'utf8'),
      updatedAt: row.updated_at,
      content: row.raw,
    };
  }

  searchSpecs(project: string, query: string, limit: number): SearchResult[] {
    const rows = this.db
      .prepare('SELECT path, raw FROM specs WHERE project = ? ORDER BY path')
      .all(project) as Array<{ path: string; raw: string }>;

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    const results: SearchResult[] = [];
    for (const row of rows) {
      const lines = row.raw.split(/\r?\n/);

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lowered = line.toLowerCase();
        const found = terms.length === 0 ? lowered.includes(query.toLowerCase()) : terms.some((term) => lowered.includes(term));
        if (!found) {
          continue;
        }

        results.push({
          relativePath: row.path,
          lineNumber: index + 1,
          excerpt: lines
            .slice(index, Math.min(index + 3, lines.length))
            .map((entry) => entry.trim())
            .filter(Boolean)
            .join(' '),
        });

        if (results.length >= limit) {
          return results;
        }
      }
    }

    return results;
  }

  listRaw(project: string): Array<{ relativePath: string; content: string }> {
    const rows = this.db
      .prepare('SELECT path, raw FROM specs WHERE project = ? ORDER BY path')
      .all(project) as Array<{ path: string; raw: string }>;

    return rows.map((row) => ({ relativePath: row.path, content: row.raw }));
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        name TEXT PRIMARY KEY,
        updated_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS specs (
        id INTEGER PRIMARY KEY,
        project TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('api', 'domain', 'workflow', 'validation', 'event', 'rule')),
        version TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        raw TEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE(project, path),
        FOREIGN KEY(project) REFERENCES projects(name) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS index_state (
        project TEXT NOT NULL,
        path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY(project, path),
        FOREIGN KEY(project) REFERENCES projects(name) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_specs_project_type ON specs(project, type);
      CREATE INDEX IF NOT EXISTS idx_specs_project_path ON specs(project, path);
    `);
  }
}
