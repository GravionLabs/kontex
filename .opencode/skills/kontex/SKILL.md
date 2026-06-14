# kontex Monorepo Skill

pnpm monorepo with TypeScript MCP servers, CLI plugins, and shared packages.

## Commands

```bash
pnpm build         # compile all packages
pnpm dev           # tsx watch mode
pnpm test          # run all tests
pnpm test:watch    # vitest watch
pnpm check         # biome lint + format
```

## Tasks

### Add a new package

1. Create `packages/<name>/` with:
   - `package.json` — `name: @gravionlabs/kontex-<name>`, `publishConfig` pointing to `npm.pkg.github.com`, `files: ["dist","src"]`
   - `tsconfig.json` — extends `../../tsconfig.base.json`, `rootDir: src`
   - `src/index.ts` — package entry point
2. `pnpm install` (updates lockfile)
3. `pnpm build` — verify compile
4. Add tests in `packages/<name>/tests/`

### Add a new MCP tool to scribe

1. Create `packages/scribe/src/tools/<name>.ts`:
   - Export `registerXxxTool(server: McpServer, store: SpecStore): void`
   - Use `zod` for input schema
   - Error handling: `catch { return formatToolError(error, 'Fallback message.') }`
2. Import and call in `packages/scribe/src/server.ts` `createServer()`
3. Test via `packages/scribe/tests/services.test.ts`

### Add a new service

1. Create `packages/scribe/src/services/<name>.ts`
2. Import ESM-style with `.js` extension
3. Wire into `SpecStore` facade or inject directly into tool

### Modify SQLite schema

1. Add `CREATE TABLE IF NOT EXISTS` to `SqliteSpecStore.initializeSchema()`
2. Add prepared statements in relevant methods
3. Test: open DB with `new Database(dbPath, { readonly: true })` and assert columns

### Add a new env var

1. Read in `ProjectRegistry.loadProjectConfig()`
2. Add to `ProjectConfig` type
3. Document in `references/env-vars.md`

### Implement an EmbeddingProvider plugin

1. Implement `EmbeddingProvider` from `@kontex/types`
2. Pass instance to `createServer(embeddingProvider)` in `packages/scribe/src/index.ts`

## Conventions

- **ESM imports**: All local imports use `.js` extension — required by `"module": "NodeNext"`
- **Error handling**: `return formatToolError(error, 'Fallback message.')` — never throw from tool handlers
- **Path security**: validated via Zod schema + `ensureAllowedSpecRelativePath` / `ensureAllowedRootPath`
- **Tests**: Use `mkdtemp` for fixtures, restore `process.env` in `afterEach`
- **Commits**: conventional commits — `feat:`, `fix:`, `refactor:`, `chore:`

## References

- `references/architecture.md` — layers and data flow
- `references/schema.md` — all SQLite tables
- `references/env-vars.md` — environment variables
- `references/commands.md` — per-package command reference

## Scripts

- `scripts/new-package.sh <name>` — scaffold a new package
- `scripts/new-tool.sh <name>` — scaffold a new MCP tool
