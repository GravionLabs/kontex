# Copilot Instructions

## Commands

```bash
pnpm build             # compile TypeScript to dist/
pnpm dev               # run with tsx watch (development)
pnpm test              # run all tests once
pnpm test:watch        # run tests in watch mode
pnpm lint              # lint src/ and tests/
pnpm format            # format src/ and tests/ (writes changes)
pnpm check             # lint + format + organize imports (writes changes)

# Run a single test file
npx vitest run tests/services.test.ts
npx vitest run tests/sqlite-store.test.ts
```

## Architecture

This is a **TypeScript MCP (Model Context Protocol) server** that exposes spec documents from a project's `docs/` and `specs/` directories as tools to AI agents.

**Entry point**: `src/index.ts` → `src/server.ts` (`createServer`)

**Core layers:**
- `src/tools/` — MCP tool registration. Each file exports one `registerXxxTool(server, store)` function called in `createServer`.
- `src/services/spec-store.ts` — `SpecStore` is the unified facade for all tools. It delegates to either filesystem or SQLite depending on `projectRegistry.mode`.
- `src/services/sqlite-spec-store.ts` — `SqliteSpecStore` wraps `better-sqlite3` and maintains a `specs` table plus an `index_state` table for SHA-256-based change detection. Reindexing runs automatically on every read.
- `src/services/project-registry.ts` — reads environment variables and resolves project names to absolute root directories. Project names are normalized to lowercase.
- `src/services/spec-types.ts` — pure utility functions: `detectSpecType`, `resolveSpecVersion`, `toNormalizedContent`, `contentHash`.
- `src/services/rules.ts` — centralizes Zod schemas, `SpecServerError`, path validation (`ensureAllowedSpecRelativePath`, `ensureAllowedRootPath`), and tool response helpers (`textContent`, `formatToolError`).
- `src/services/markdown-loader.ts` — filesystem reads; only serves files under `docs/` and `specs/` with extensions `.md`, `.markdown`, `.yaml`, `.yml`, `.json`.
- `src/services/teams-scanner.ts` — scans spec content for headings/keywords related to Teams/support context.

**Storage modes** (set via `SPEC_SERVER_MODE`):
- `filesystem` (default): files are read directly from disk on every request.
- `sqlite`: files are indexed into a SQLite DB; reads are served from the DB, with automatic hash-diff updates on each call.

**Environment variables:**
- `SPEC_SERVER_MODE` — `filesystem` | `sqlite`
- `SPEC_SERVER_SQLITE_PATH` — path to DB file (default: `.kontex/specs.db`)
- `SPEC_SERVER_DEFAULT_PROJECT` — default project name (defaults to `basename(cwd)`)
- `SPEC_SERVER_PROJECTS` — multi-project mapping, e.g. `name=/abs/path;name2=/path2`

## Key Conventions

**ESM imports**: The project uses `"module": "NodeNext"`. All local imports must use the `.js` extension, even though source files are `.ts`.

**Tool registration pattern**: each tool lives in its own file and exports a single `registerXxxTool(server: McpServer, store: SpecStore): void` function. No tool file holds state.

**Error handling in tools**: always return `formatToolError(error, 'Fallback message.')` from catch blocks; never throw from a tool handler. `SpecServerError` messages are surfaced directly to the caller.

**Path security**: all spec paths are validated twice — once in `rules.ts` (Zod schema + `ensureAllowedSpecRelativePath`) and once in `markdown-loader.ts` / `sqlite-spec-store.ts`. Never skip these checks when adding new file access.

**Spec type detection** (`detectSpecType` in `spec-types.ts`): inferred first from the file path (keyword match), then from file content. The six valid types are `api | domain | workflow | validation | event | rule`.

**Tests use temp directories**: test fixtures are written to `os.tmpdir()` with `mkdtemp`; there are no committed fixture files. SQLite tests manipulate `process.env` directly and restore it with `afterEach`.

**`docs/` vs `specs/`**: `docs/` holds human-readable markdown; `specs/` holds machine-readable YAML/JSON. Both are served identically by the server.
