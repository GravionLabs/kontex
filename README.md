# kontex — Monorepo for Copilot CLI Plugins & MCP Servers

A **pnpm monorepo** providing prompt compression, persistent session memory, LLM model recommendations, and spec-doc serving for GitHub Copilot CLI and opencode.

## Packages

| Package | Role |
|---|---|
| `@gravionlabs/kontex-compress` | Caveman lossy compression (lite/full/ultra/wenyan), content-type aware (md/json/diff/log), CLI (`kontex-compress`) + lib |
| `@gravionlabs/kontex-types` | Shared singletons: `globalCompressionMode`, `globalContextBudget`, `globalEventBus`, `EmbeddingProvider` interface |
| `@gravionlabs/kontex-scribe` | MCP spec server — 8 tools (`get-context`, `load-spec`, `search-specs`, `list-specs`, `write-spec`, `reindex-specs`, `teams-context`, `compress-artifact`), SQLite+FTS5, optional embeddings |
| `@gravionlabs/kontex-herald` | Copilot CLI plugin — lifecycle hooks, SQLite session memory, auto-escalate compression on budget pressure |
| `@gravionlabs/kontex-oracle` | LLM model recommender from GH issue complexity — CLI (`oracle`) + MCP server |

## Quick Start

```bash
# Install dependencies (all packages)
pnpm install

# Build all packages
pnpm build

# Run tests (all packages)
pnpm test
pnpm test:watch

# Lint & format (all packages)
pnpm check

# Work in a single package
cd packages/scribe
pnpm build
pnpm test

# Interactive MCP Inspector (from packages/scribe)
pnpm inspect                  # Opens web UI to test tools interactively
```

## Structure

```
kontex/
├── packages/
│   ├── compress/           # @gravionlabs/kontex-compress — compression lib + CLI
│   ├── types/              # @gravionlabs/kontex-types — shared singletons + types
│   ├── scribe/             # @gravionlabs/kontex-scribe — MCP server for spec docs
│   ├── herald/             # @gravionlabs/kontex-herald — Copilot CLI plugin
│   └── oracle/             # @gravionlabs/kontex-oracle — model recommender MCP + CLI
├── .opencode/
│   └── plugin/             # @gravionlabs/kontex-plugin — opencode plugin
├── pnpm-workspace.yaml     # Workspace config
├── tsconfig.base.json      # Shared TypeScript config
├── biome.json              # Linter & formatter
└── .github/
    ├── copilot-instructions.md
    └── copilot-setup-steps.yml
```

## Storage

All packages share a single SQLite database at `.kontex/kontex.db` (path configurable via `KONTEX_DB_PATH`).

| Package | Tables |
|---|---|
| scribe | `projects`, `specs`, `specs_fts`, `sources`, `embeddings`, `index_state` |
| herald / plugin | `sessions`, `observations` |

## Development

- **ESM + NodeNext**: All packages use ES modules (`"module": "NodeNext"`)
- **TypeScript 6**: Latest stable; compiles to ES2022
- **Biome**: Fast linter + formatter for all packages
- **Vitest**: Unit tests (SQLite, MCP tools, etc.)

## Contributing

1. Make changes in the relevant `packages/*/src/`
2. Run tests: `pnpm test` (or `pnpm -r test` for per-package isolation)
3. Check linting: `pnpm check`
4. Commit: conventional commits with `Co-authored-by: Copilot` trailer
