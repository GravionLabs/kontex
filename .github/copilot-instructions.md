# Copilot Instructions

## Monorepo Structure

**kontex** is a pnpm monorepo with three packages:

- **`@kontex/mcp-specs`** — MCP server for spec documents (`get-context`, `load-spec`, `search-specs`)
- **`@kontex/cli-plugin`** — Copilot CLI plugin: prompt compression (preCompact hook) + session memory (cavemem)
- **`@kontex/mcp-devtools`** — MCP server for dev tool execution (pytest, dotnet, npm, cargo, etc.)

## Using kontex MCP Tools

When the `@kontex/mcp-specs` MCP server is available, call `get-context` when you enter a new workflow phase:

```
get-context(phase: "<phase>")
```

Phases: `analysis`, `planning`, `implementation`, `testing`, `verification`.

Use `mode: "summary"` for first pass, then `load-spec` for full files. On repeated calls, reuse `version` fingerprints as `knownVersions` to omit unchanged specs.

## Commands

```bash
pnpm build             # build all packages via -r
pnpm dev               # dev mode all packages
pnpm test              # test all packages
pnpm test:watch        # watch mode test all
pnpm lint              # lint all packages
pnpm format            # format all packages
pnpm check             # lint + format all

# Single package (e.g., mcp-specs):
cd packages/mcp-specs
pnpm build
pnpm dev
pnpm test

# Run a specific test:
npx vitest run packages/mcp-specs/tests/services.test.ts
```

## Architecture

**@kontex/mcp-specs:**
- MCP server exposing spec documents from `docs/` and `specs/`
- Entry: `packages/mcp-specs/src/index.ts` → `server.ts`
- Tools: `get-context`, `load-spec`, `search-specs`, `list-specs`, etc.
- Services: `spec-store.ts`, `sqlite-spec-store.ts`, `spec-types.ts`, `project-registry.ts`, etc.

**@kontex/cli-plugin:**
- Copilot CLI plugin (registration via `.github/` or plugin marketplace)
- `src/hooks/pre-compact.ts` — intercepts `/compact` to compress prompts before context reduction
- `src/memory/cavemem.ts` — integrates cavemem npm package for persistent cross-session memory via SQLite

**@kontex/mcp-devtools:**
- MCP server for dev tool execution
- Upcoming tools: pytest runner, dotnet runner, npm runner, cargo runner, etc.


**Storage modes** (set via `SPEC_SERVER_MODE`):
- `sqlite` **(default)**: files are indexed into a SQLite DB; reads are served from the DB, with automatic hash-diff updates and FTS5 + BM25 search.
- `filesystem`: files are read directly from disk on every request (opt-out).

**Environment variables:**
- `SPEC_SERVER_MODE` — `filesystem` to opt out of SQLite (default: `sqlite`)
- `SPEC_SERVER_SQLITE_PATH` — path to DB file (default: `.kontex/specs.db`)
- `SPEC_SERVER_DEFAULT_PROJECT` — default project name (defaults to `basename(cwd)`)
- `SPEC_SERVER_PROJECTS` — multi-project mapping, e.g. `name=/abs/path;name2=/path2`

## Key Conventions

**ESM imports**: The project uses `"module": "NodeNext"`. All local imports must use the `.js` extension, even though source files are `.ts`.

**Tool registration pattern**: each tool lives in its own file and exports a single `registerXxxTool(server: McpServer, store: SpecStore): void` function. No tool file holds state.

**Error handling in tools**: always return `formatToolError(error, 'Fallback message.')` from catch blocks; never throw from a tool handler. `SpecServerError` messages are surfaced directly to the caller.

**`get-context` contract**: tool returns per-file `version` fingerprints. On follow-up context loads, pass those values back via `knownVersions` to avoid resending unchanged context.

**Path security**: all spec paths are validated twice — once in `rules.ts` (Zod schema + `ensureAllowedSpecRelativePath`) and once in `markdown-loader.ts` / `sqlite-spec-store.ts`. Never skip these checks when adding new file access.

**Spec type detection** (`detectSpecType` in `spec-types.ts`): inferred first from the file path (keyword match), then from file content. The six valid types are `api | domain | workflow | validation | event | rule`.

**Tests use temp directories**: test fixtures are written to `os.tmpdir()` with `mkdtemp`; there are no committed fixture files. SQLite tests manipulate `process.env` directly and restore it with `afterEach`.

**`docs/` vs `specs/`**: `docs/` holds human-readable markdown; `specs/` holds machine-readable YAML/JSON. Both are served identically by the server.
