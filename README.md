# kontex — Monorepo for Copilot CLI Plugins & MCP Servers

A **pnpm monorepo** providing prompt compression, persistent session memory, and efficient dev tool execution for GitHub Copilot CLI.

## Packages

### `@kontex/mcp-specs`
MCP server that exposes AI-friendly spec documents from a project's `docs/` and `specs/` directories.
- **Tools**: `get-context` (phases), `load-spec`, `search-specs`, `list-specs`, `compress-artifact`
- **Storage**: SQLite + FTS5 or filesystem mode
- **Use case**: Load project context efficiently without re-reading files every turn

### `@kontex/cli-plugin`
GitHub Copilot CLI plugin for prompt compression and persistent session memory.
- **preCompact hook**: Compresses prompts before `/compact` context reduction
- **cavemem integration**: Persistent cross-session memory via local SQLite + caveman compression
- **Use case**: Reduce token spend and remember prior decisions across sessions

### `@kontex/mcp-devtools`
MCP server for efficient dev tool execution (pytest, dotnet build, npm run, cargo, etc.).
- **Tools**: Planned — pytest, dotnet, npm, cargo runners
- **Use case**: Execute build/test commands from AI agents without manual CLI work

## Quick Start

```bash
# Install dependencies (all packages)
pnpm install

# Build all packages
pnpm build

# Run dev mode (all packages)
pnpm dev

# Run tests (all packages)
pnpm test
pnpm test:watch

# Lint & format (all packages)
pnpm lint
pnpm format
pnpm check

# Work in a single package
cd packages/mcp-specs
pnpm build
pnpm test

# Interactive MCP Inspector (from packages/mcp-specs)
pnpm inspect                  # Opens web UI to test tools interactively
```

## Structure

```
kontex/
├── packages/
│   ├── mcp-specs/          # @kontex/mcp-specs — MCP server for spec docs
│   ├── cli-plugin/         # @kontex/cli-plugin — CLI plugin with cavemem
│   └── mcp-devtools/       # @kontex/mcp-devtools — MCP server for dev tools
├── pnpm-workspace.yaml     # Workspace config
├── tsconfig.base.json      # Shared TypeScript config
├── biome.json              # Linter & formatter
└── .github/
    ├── copilot-instructions.md
    └── copilot-setup-steps.yml
```

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
