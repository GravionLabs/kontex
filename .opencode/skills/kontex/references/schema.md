# SQLite Schema

Defined in `SqliteSpecStore.initializeSchema()` — created via `CREATE TABLE IF NOT EXISTS` on every startup. No migration tooling.

## projects

| Column | Type | Notes |
|---|---|---|
| `name` | TEXT PK | Lowercased project name |
| `updated_at` | DATETIME | Last reindex timestamp |

## specs

Main content store for FTS5 search and spec tools.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `project` | TEXT NOT NULL | FK → projects(name) ON DELETE CASCADE |
| `type` | TEXT NOT NULL | CHECK `('api'|'domain'|'workflow'|'validation'|'event'|'rule')` |
| `version` | TEXT NOT NULL | SHA-256 hex hash |
| `path` | TEXT NOT NULL | Relative path e.g. `docs/rules.md` |
| `content` | TEXT NOT NULL | Normalized (JSON for YAML/JSON, `{format,text}` for markdown) |
| `raw` | TEXT NOT NULL | Original file content |
| `updated_at` | DATETIME NOT NULL | |

Indexes: `idx_specs_project_type`, `idx_specs_project_path`
Unique: `(project, path)`

## specs_fts

FTS5 virtual table for BM25 text search.

| Column | Type | Notes |
|---|---|---|
| `path` | TEXT | Indexed |
| `raw` | TEXT | Indexed content |
| `project` | TEXT UNINDEXED | Filter-only |

Synced with `specs` — INSERT/UPDATE/DELETE triggers in `reindexProject()`.

## sources

Generic content store for multi-content-type support (specs, session memory, etc.).

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `source_type` | TEXT NOT NULL | `'spec'` or `'spec-chunk'` |
| `project` | TEXT NOT NULL | |
| `source_key` | TEXT NOT NULL | e.g. `docs/rules.md`, `docs/rules.md#chunk-0` |
| `content` | TEXT NOT NULL | Chunk-level content |
| `version` | TEXT NOT NULL | SHA-256 hex hash |
| `updated_at` | DATETIME NOT NULL | |

Index: `idx_sources_type_project(source_type, project)`
Unique: `(source_type, project, source_key)`

## embeddings

Vector storage for semantic search.

| Column | Type | Notes |
|---|---|---|
| `source_id` | INTEGER PK FK | → sources(id) ON DELETE CASCADE |
| `model` | TEXT PK | Provider model name e.g. `test-model` |
| `vector` | BLOB NOT NULL | JSON array of floats |

PK: `(source_id, model)`
