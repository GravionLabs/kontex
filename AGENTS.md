# AGENTS.md

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

## Commands

```bash
pnpm build          # compile TypeScript → dist/
pnpm dev            # tsx watch src/index.ts (development)
pnpm test           # run all tests once
pnpm test:watch     # vitest in watch mode
pnpm check          # biome lint + format + organize imports (writes changes)

# Run a single test file
npx vitest run tests/sqlite-store.test.ts
```

## Architecture

**Entry point**: `src/index.ts` → `src/server.ts` (`createServer`) registers all tools and wires `ProjectRegistry → SpecStore → tools`.

**Layer responsibilities:**
- `src/tools/` — one file per MCP tool, each exports a single `registerXxxTool(server, store)` function. Tools hold no state; all logic lives in services.
- `src/services/spec-store.ts` — unified facade called by every tool. Dispatches to `SqliteSpecStore` (default) or `markdown-loader.ts` (filesystem mode) based on `projectRegistry.mode`.
- `src/services/sqlite-spec-store.ts` — wraps `better-sqlite3`; maintains a `specs` table + `index_state` table using SHA-256 hashes. `reindexProject()` is called on every read via `SpecStore.ensureIndexed()` — no separate sync step needed.
- `src/services/project-registry.ts` — reads env vars, normalizes project names to lowercase, resolves names → absolute root dirs.
- `src/services/spec-types.ts` — pure utilities: `detectSpecType`, `summarizeContent`, `contentHash`, `PHASE_SPEC_DIRS`, `GLOBAL_CONTEXT_PATHS`.
- `src/services/rules.ts` — Zod schemas, `SpecServerError`, path validation helpers (`ensureAllowedSpecRelativePath`, `ensureAllowedRootPath`), and tool response helpers (`textContent`, `formatToolError`).

## Key Conventions

**ESM `.js` imports**: The project uses `"module": "NodeNext"`. All local imports must use `.js` extensions even though source files are `.ts`.

**Adding a new tool**: create `src/tools/my-tool.ts` exporting `registerMyTool(server: McpServer, store: SpecStore): void`, then call it in `createServer()` in `src/server.ts`. Never add state to tool files.

**Error handling**: catch blocks must `return formatToolError(error, 'Fallback message.')` — never throw from a tool handler. `SpecServerError` messages are surfaced verbatim to the caller.

**Path security**: paths are validated twice — once via Zod (`specPathSchema` in `rules.ts`) and once in `ensureAllowedSpecRelativePath` / `ensureAllowedRootPath`. Only `docs/` and `specs/` prefixes are allowed; extensions restricted to `.md .markdown .yaml .yml .json`.

**`detectSpecType`** (`spec-types.ts`): inferred first from file path keywords, then from content. Seven valid types: `api | domain | workflow | validation | event | rule | deploy`. YAML/YML files default to `api` if no other keyword matches.

## Storage Modes

| Mode               | Env                           | Behaviour                                                                                                      |
|--------------------|-------------------------------|----------------------------------------------------------------------------------------------------------------|
| `sqlite` (default) | —                             | Files indexed to `.kontex/kontex.db`; reads served from DB; FTS5+BM25 search; SHA-256 auto-diff on every read |
| `filesystem`       | `SPEC_SERVER_MODE=filesystem` | Files read directly from disk on every request; `reindex-specs` not available                                  |

**Multi-project**: `SPEC_SERVER_PROJECTS=name=/abs/path;name2=/abs/path` — project names are lowercased on lookup.

## `get-context` Phase Map

Always loaded: `specs/architecture/rules.md` and `docs/conventions.md`.

| Phase            | Additional spec dirs                                                         |
|------------------|------------------------------------------------------------------------------|
| `analysis`       | `specs/architecture/`, `specs/domain/`                                       |
| `planning`       | `specs/architecture/`, `specs/domain/`, `specs/api/`                         |
| `implementation` | `specs/architecture/`, `specs/api/`, `specs/validation/`, `specs/workflows/` |
| `testing`        | `specs/validation/`, `specs/workflows/`                                      |
| `verification`   | `specs/domain/`, `specs/validation/`                                         |
| `deploy`         | `specs/architecture/`, `specs/deploy/`, `specs/validation/`                  |

Use `mode: "summary"` when many files are loaded to get heading + first paragraph (~120 chars) per file, then call `load-spec` for the files you need in full.

## Testing Patterns

Tests write fixtures to `os.tmpdir()` via `mkdtemp` — there are no committed fixture files. SQLite tests manipulate `process.env` directly and restore it in `afterEach`. See `tests/services.test.ts` and `tests/sqlite-store.test.ts` for examples.

