# Architecture

## Layer flow

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
