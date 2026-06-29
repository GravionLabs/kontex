import { mkdirSync } from 'node:fs';
import path from 'node:path';

import type { EmbeddingProvider } from '@gravionlabs/kontex-types';

import Database from 'better-sqlite3';
import { chunkMarkdown } from './chunk-utils.js';
import { topK } from './embedding-search.js';
import { listSpecFiles, loadSpecFile } from './markdown-loader.js';
import { ensureAllowedSpecRelativePath, SpecServerError } from './rules.js';
import {
  contentHash,
  getFileKind,
  parseFrontmatter,
  type ReindexResult,
  type SearchResult,
  type SpecDirectory,
  type SpecFileInfo,
  type SpecStatus,
} from './spec-types.js';

interface StoredSourceRow {
  path: string;
  raw: string;
  version: string;
  updated_at: string;
  status: string;
  owner: string | null;
}

interface KnownPathRow {
  id: number;
  source_key: string;
}

function sanitizeFtsQuery(query: string): string {
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/"/g, '').trim())
    .filter(Boolean);
  if (terms.length === 0) return '';
  return terms.map((t) => `"${t}"`).join(' OR ');
}

export class SqliteSpecStore {
  private readonly db: Database.Database;

  constructor(
    private readonly dbPath: string,
    private readonly embeddingProvider?: EmbeddingProvider,
  ) {
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
    this.db
      .prepare(
        'INSERT INTO projects (name, updated_at) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at',
      )
      .run(project, now);

    const files = await listSpecFiles(rootDir);
    const readVersion = this.db.prepare(
      "SELECT version FROM sources WHERE source_type = 'spec' AND project = ? AND source_key = ?",
    );
    const upsertSource = this.db.prepare(`
      INSERT INTO sources (source_type, project, source_key, content, version, updated_at, status, owner)
      VALUES ('spec', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_type, project, source_key) DO UPDATE SET
        content = excluded.content,
        version = excluded.version,
        updated_at = excluded.updated_at,
        status = excluded.status,
        owner = excluded.owner
    `);
    const getSourceId = this.db.prepare(
      "SELECT id FROM sources WHERE source_type = 'spec' AND project = ? AND source_key = ?",
    );
    const deleteFts = this.db.prepare('DELETE FROM sources_fts WHERE rowid = ?');
    const insertFts = this.db.prepare(
      "INSERT INTO sources_fts(rowid, source_key, content, source_type, project) VALUES (?, ?, ?, 'spec', ?)",
    );
    const upsertEmbedding = this.db.prepare(`
      INSERT INTO embeddings (source_id, model, vector)
      VALUES (?, ?, ?)
      ON CONFLICT(source_id, model) DO UPDATE SET
        vector = excluded.vector
    `);

    const knownPaths = this.db
      .prepare(
        "SELECT id, source_key FROM sources WHERE source_type = 'spec' AND project = ? AND source_key NOT LIKE '%#chunk-%'",
      )
      .all(project) as KnownPathRow[];
    const seenPaths = new Set<string>();

    let updated = 0;
    let skipped = 0;
    const updatedSources: Array<{ sourceId: number; content: string }> = [];
    for (const file of files) {
      const loaded = await loadSpecFile(rootDir, file.relativePath);
      const hash = contentHash(loaded.content);
      const previous = readVersion.get(project, loaded.relativePath) as { version: string } | undefined;
      seenPaths.add(loaded.relativePath);

      if (previous?.version === hash) {
        skipped += 1;
        continue;
      }

      const fm = parseFrontmatter(loaded.content);
      upsertSource.run(
        project,
        loaded.relativePath,
        loaded.content,
        hash,
        loaded.updatedAt,
        fm.status,
        fm.owner ?? null,
      );
      const sourceRow = getSourceId.get(project, loaded.relativePath) as { id: number };

      deleteFts.run(sourceRow.id);
      insertFts.run(sourceRow.id, loaded.relativePath, loaded.content, project);

      if (this.embeddingProvider) {
        const chunks = chunkMarkdown(loaded.content);
        for (const chunk of chunks) {
          const chunkKey = `${loaded.relativePath}#chunk-${chunk.chunkIndex}`;
          const chunkHash = contentHash(chunk.content);
          upsertSource.run(project, chunkKey, chunk.content, chunkHash, loaded.updatedAt, fm.status, fm.owner ?? null);
          const chunkRow = getSourceId.get(project, chunkKey) as { id: number } | undefined;
          if (chunkRow) {
            updatedSources.push({ sourceId: chunkRow.id, content: chunk.content });
          }
        }
      }

      updated += 1;
    }

    if (updatedSources.length > 0 && this.embeddingProvider) {
      const vectors = await this.embeddingProvider.embed(updatedSources.map((s) => s.content));
      const vectorJson = vectors.map((v) => JSON.stringify(v));
      for (let i = 0; i < updatedSources.length; i++) {
        upsertEmbedding.run(updatedSources[i].sourceId, this.embeddingProvider.model, vectorJson[i]);
      }
    }

    const deleteOrphanedSources = this.db.prepare(
      'DELETE FROM sources WHERE source_type = ? AND project = ? AND source_key LIKE ?',
    );

    let deleted = 0;
    for (const entry of knownPaths) {
      if (seenPaths.has(entry.source_key)) {
        continue;
      }

      deleteFts.run(entry.id);
      deleteOrphanedSources.run('spec', project, entry.source_key);
      deleteOrphanedSources.run('spec', project, `${entry.source_key}#%`);
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

  listSpecs(project: string, directory?: SpecDirectory, status?: SpecStatus): SpecFileInfo[] {
    const statusClause = status ? 'AND status = ?' : '';
    const rows = directory
      ? (this.db
          .prepare(
            `SELECT source_key AS path, content AS raw, updated_at, status, owner
             FROM sources
             WHERE source_type = 'spec' AND project = ? AND source_key LIKE ? AND source_key NOT LIKE '%#chunk-%'
             ${statusClause}
             ORDER BY source_key`,
          )
          .all(...[project, `${directory}/%`].concat(status ? [status] : [])) as StoredSourceRow[])
      : (this.db
          .prepare(
            `SELECT source_key AS path, content AS raw, updated_at, status, owner
             FROM sources
             WHERE source_type = 'spec' AND project = ? AND source_key NOT LIKE '%#chunk-%'
             ${statusClause}
             ORDER BY source_key`,
          )
          .all(...[project].concat(status ? [status] : [])) as StoredSourceRow[]);

    return rows.map((row) => ({
      relativePath: row.path,
      kind: getFileKind(row.path),
      size: Buffer.byteLength(row.raw, 'utf8'),
      updatedAt: row.updated_at,
      status: (row.status ?? 'draft') as SpecStatus,
      owner: row.owner ?? undefined,
    }));
  }

  loadSpec(project: string, relativePath: string): SpecFileInfo & { content: string } {
    const normalizedPath = ensureAllowedSpecRelativePath(relativePath);
    const row = this.db
      .prepare(
        `SELECT source_key AS path, content AS raw, updated_at, status, owner
         FROM sources
         WHERE source_type = 'spec' AND project = ? AND source_key = ?`,
      )
      .get(project, normalizedPath) as StoredSourceRow | undefined;

    if (!row) {
      throw new SpecServerError('Spec file not found.');
    }

    return {
      relativePath: row.path,
      kind: getFileKind(row.path),
      size: Buffer.byteLength(row.raw, 'utf8'),
      updatedAt: row.updated_at,
      status: (row.status ?? 'draft') as SpecStatus,
      owner: row.owner ?? undefined,
      content: row.raw,
    };
  }

  async searchSpecs(project: string, query: string, limit: number): Promise<SearchResult[]> {
    if (this.embeddingProvider) {
      return this.hybridSearch(project, query, limit);
    }

    return this.ftsSearch(project, query, limit);
  }

  /**
   * Pure FTS5/BM25 search — used directly when no embedding provider is configured,
   * and as one leg of hybrid search when a provider is present.
   */
  private ftsSearch(project: string, query: string, limit: number): SearchResult[] {
    const ftsQuery = sanitizeFtsQuery(query);
    if (!ftsQuery) return [];

    try {
      const rows = this.db
        .prepare(
          `SELECT s.source_key AS path,
                  snippet(sources_fts, 1, '**', '**', '...', 24) AS excerpt,
                  bm25(sources_fts) AS score
           FROM sources_fts
           JOIN sources s ON sources_fts.rowid = s.id
           WHERE sources_fts MATCH ? AND sources_fts.source_type = 'spec' AND sources_fts.project = ?
             AND s.source_key NOT LIKE '%#chunk-%'
           ORDER BY bm25(sources_fts)
           LIMIT ?`,
        )
        .all(ftsQuery, project, limit) as Array<{ path: string; excerpt: string; score: number }>;

      return rows.map((row) => ({
        relativePath: row.path,
        lineNumber: 0,
        excerpt: row.excerpt ?? '',
        score: row.score,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Hybrid BM25 + cosine retrieval with configurable alpha weighting.
   *
   * hybridScore = alpha * norm(bm25) + (1 - alpha) * norm(cosine)
   *
   * KONTEX_RETRIEVAL_ALPHA env var controls alpha (default 0.5).
   * alpha=1.0 → pure BM25 order; alpha=0.0 → pure cosine order.
   */
  async hybridSearch(project: string, query: string, limit: number): Promise<SearchResult[]> {
    const provider = this.embeddingProvider;
    if (!provider) return this.ftsSearch(project, query, limit);

    const alpha = Math.max(0, Math.min(1, Number(process.env.KONTEX_RETRIEVAL_ALPHA ?? '0.5')));
    const fetch2N = limit * 2;

    // --- BM25 leg ---
    const ftsRows = this.ftsSearch(project, query, fetch2N);
    // BM25 values from SQLite FTS5 are negative; negate so higher = better
    const bm25Map = new Map<string, { excerpt: string; raw: number }>();
    for (const row of ftsRows) {
      const existing = bm25Map.get(row.relativePath);
      const negated = -(row.score ?? 0);
      if (!existing || negated > existing.raw) {
        bm25Map.set(row.relativePath, { excerpt: row.excerpt, raw: negated });
      }
    }

    // --- Cosine leg ---
    const stored = this.db
      .prepare(
        `SELECT e.source_id, e.vector, s.source_key, s.content
         FROM embeddings e
         JOIN sources s ON e.source_id = s.id
         WHERE s.source_type = 'spec' AND s.project = ? AND e.model = ?`,
      )
      .all(project, provider.model) as Array<{
      source_id: number;
      vector: string;
      source_key: string;
      content: string;
    }>;

    const cosineMap = new Map<string, { excerpt: string; raw: number }>();
    if (stored.length > 0) {
      const queryVec = await provider.embed([query]);
      if (queryVec.length > 0) {
        const items = stored.map((row) => ({
          sourceId: row.source_id,
          vector: JSON.parse(row.vector) as number[],
        }));
        const top = topK(queryVec[0], items, fetch2N);
        const storedById = new Map(stored.map((row) => [row.source_id, row]));
        for (const match of top) {
          const row = storedById.get(match.sourceId);
          if (!row) continue;
          const filePath = row.source_key.replace(/#chunk-\d+$/, '');
          const existing = cosineMap.get(filePath);
          if (!existing || match.score > existing.raw) {
            cosineMap.set(filePath, { excerpt: row.content.slice(0, 200), raw: match.score });
          }
        }
      }
    }

    // --- Normalise [0,1] ---
    const normalise = (map: Map<string, { excerpt: string; raw: number }>): Map<string, number> => {
      const values = [...map.values()].map((v) => v.raw);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const norm = new Map<string, number>();
      for (const [key, v] of map) {
        norm.set(key, range === 0 ? 1 : (v.raw - min) / range);
      }
      return norm;
    };

    const bm25Norm = bm25Map.size > 0 ? normalise(bm25Map) : new Map<string, number>();
    const cosineNorm = cosineMap.size > 0 ? normalise(cosineMap) : new Map<string, number>();

    // --- Merge ---
    const allPaths = new Set([...bm25Map.keys(), ...cosineMap.keys()]);
    const merged: Array<{ relativePath: string; excerpt: string; score: number }> = [];

    for (const filePath of allPaths) {
      const bScore = bm25Norm.get(filePath) ?? 0;
      const cScore = cosineNorm.get(filePath) ?? 0;
      const hybrid = alpha * bScore + (1 - alpha) * cScore;
      const excerpt = bm25Map.get(filePath)?.excerpt ?? cosineMap.get(filePath)?.excerpt ?? '';
      merged.push({ relativePath: filePath, excerpt, score: hybrid });
    }

    merged.sort((a, b) => b.score - a.score);

    return merged.slice(0, limit).map((r) => ({
      relativePath: r.relativePath,
      lineNumber: 0,
      excerpt: r.excerpt,
      score: r.score,
    }));
  }

  listRaw(project: string): Array<{ relativePath: string; content: string; version: string; status: SpecStatus }> {
    const rows = this.db
      .prepare(
        `SELECT source_key AS path, content AS raw, version, status
         FROM sources
         WHERE source_type = 'spec' AND project = ? AND source_key NOT LIKE '%#chunk-%'
         ORDER BY source_key`,
      )
      .all(project) as Array<{
      path: string;
      raw: string;
      version: string;
      status: string;
    }>;

    return rows.map((row) => ({
      relativePath: row.path,
      content: row.raw,
      version: row.version,
      status: (row.status ?? 'draft') as SpecStatus,
    }));
  }

  private initializeSchema(): void {
    this.db.exec(`
      DROP TABLE IF EXISTS specs_fts;
      DROP TABLE IF EXISTS specs;
      DROP TABLE IF EXISTS index_state;

      CREATE TABLE IF NOT EXISTS projects (
        name TEXT PRIMARY KEY,
        updated_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY,
        source_type TEXT NOT NULL,
        project TEXT NOT NULL,
        source_key TEXT NOT NULL,
        content TEXT NOT NULL,
        version TEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE(source_type, project, source_key)
      );

      CREATE INDEX IF NOT EXISTS idx_sources_type_project ON sources(source_type, project);

      CREATE VIRTUAL TABLE IF NOT EXISTS sources_fts USING fts5(
        source_key, content, source_type UNINDEXED, project UNINDEXED
      );

      INSERT INTO sources_fts(rowid, source_key, content, source_type, project)
        SELECT id, source_key, content, source_type, project FROM sources
        WHERE id NOT IN (SELECT rowid FROM sources_fts);

      CREATE TABLE IF NOT EXISTS embeddings (
        source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        model TEXT NOT NULL,
        vector BLOB NOT NULL,
        PRIMARY KEY (source_id, model)
      );
    `);

    // Idempotent migration: add status/owner columns to existing DBs.
    // SQLite throws if the column already exists — that's the migration guard.
    try {
      this.db.exec("ALTER TABLE sources ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'");
    } catch {
      // column already exists
    }
    try {
      this.db.exec('ALTER TABLE sources ADD COLUMN owner TEXT');
    } catch {
      // column already exists
    }
  }
}
