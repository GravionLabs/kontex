# Architecture

## Monorepo layout

```
@gravionlabs/kontex-types        shared singletons + types (no deps)
        │
        ├── @gravionlabs/kontex-compress   compression lib + CLI (depends: types)
        │
        ├── @gravionlabs/kontex-scribe     MCP spec server (depends: types, compress)
        │       │
        │       └── SqliteSpecStore  →  .kontex/kontex.db
        │
        ├── @gravionlabs/kontex-herald     Copilot CLI plugin (depends: types, compress)
        │       │
        │       └── MemoryStore      →  .kontex/kontex.db  (shared DB)
        │
        ├── @gravionlabs/kontex-oracle     model recommender MCP + CLI (depends: types)
        │
        └── @gravionlabs/kontex-plugin     opencode plugin (depends: types, compress, herald)
                │
                └── MemoryStore      →  .kontex/kontex.db  (shared DB)
```

All SQLite state lives in `.kontex/kontex.db` (override via `KONTEX_DB_PATH`).

## Scribe layer flow

```
index.ts  →  server.ts (createServer)
                  │
        ProjectRegistry  (env vars → project config)
                  │
            SpecStore  (facade)
              │       │
        sqlite   filesystem
           │
   SqliteSpecStore
   (specs + sources + embeddings + FTS5)
```

## Entry point

`packages/scribe/src/index.ts` — creates `StdioServerTransport`, calls `createServer()`, connects.

## createServer()

`packages/scribe/src/server.ts` — wires `ProjectRegistry → SpecStore → tools`. Optional `EmbeddingProvider` param.

## Layer responsibilities

| Layer | Location | Role |
|---|---|---|
| Tools | `src/tools/` | One file per MCP tool. Stateless — all logic in services. |
| Services | `src/services/` | Business logic: spec-store, project-registry, rules, types. |
| Storage | `SqliteSpecStore` | SQLite with specs, sources, embeddings, FTS5 tables. |

## Data flow: tool call

```
MCP tool handler  →  SpecStore.<method>  →  SqliteSpecStore.<method>  →  SQLite
                         │                                              │
                      filesystem mode (markdown-loader.ts)          FTS5 BM25
                         │                                              │
                      embed mode (searchSpecsEmbedding)          cosine similarity
```

## Embedding chain

```
reindexProject()  →  chunkMarkdown(content)  →  chunks
                      →  embed(chunks)  →  store vectors
searchSpecs()     →  embed(query)  →  cosine similarity  →  top-k
```

## Herald memory flow

```
Copilot CLI event  →  hook-dispatch  →  MemoryStore.storeObservation()
                                              │
                                       compress(text)  →  observations table
                                       storeSession()  →  sessions table
```

## opencode plugin flow

```
opencode event (message.updated)
  →  plugin/kontex.ts event hook
  →  compress(message metadata)
  →  MemoryStore.storeObservation()  →  .kontex/kontex.db (shared with herald)
```
