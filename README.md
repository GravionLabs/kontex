# mcp-spec-server

TypeScript MCP server for specification docs. Makes AI coding agents **rule-based**:
instead of large freeform instructions, the agent selectively loads structured specs
from the repo — targeted, searchable, deterministic.

## Tools

| Tool | Description |
|------|-------------|
| `get-context` | **Primary tool.** Aggregates rules, conventions, and phase-specific specs for a given workflow phase. Call this at the start of every task. |
| `list-specs` | List all available files from `docs/` and `specs/`. |
| `load-spec` | Load a single spec file. |
| `search-specs` | Full-text search across all specs. |
| `teams-context` | Return support/team-related context from docs. |
| `reindex-specs` | Refresh SQLite index (SQLite mode only). |

## Quick Start

```bash
pnpm install
pnpm dev
```

## `get-context` — Phase-Based Context

The `get-context` tool aggregates the right project context for each development phase:

| Phase | Loaded spec directories |
|-------|-------------------------|
| `analysis` | `specs/architecture/` + `specs/domain/` + `specs/phases/analysis.md` |
| `planning` | `specs/architecture/` + `specs/domain/` + `specs/api/` + `specs/phases/planning.md` |
| `implementation` | `specs/architecture/` + `specs/api/` + `specs/validation/` + `specs/workflows/` + `specs/phases/implementation.md` |
| `testing` | `specs/validation/` + `specs/workflows/` + `specs/phases/testing.md` |
| `verification` | `specs/domain/` + `specs/validation/` + `specs/phases/verification.md` |

**Always loaded** (all phases): `specs/architecture/rules.md` and `docs/conventions.md`.

## Directory Convention

Use this layout in any repo that this server serves:

```
<project-root>/
├── CLAUDE.md                             # AI agent instructions (Claude Code)
├── .github/
│   └── copilot-instructions.md           # AI agent instructions (GitHub Copilot)
├── docs/
│   ├── architecture.md                   # System architecture overview
│   ├── conventions.md                    # Coding conventions (always loaded)
│   └── glossary.md                       # Domain glossary
└── specs/
    ├── architecture/
    │   ├── rules.md                      # Global rules (always loaded)
    │   └── conventions.yaml
    ├── domain/                           # Domain entities (YAML/MD)
    ├── api/                              # API specifications
    ├── workflows/                        # Workflow descriptions
    ├── validation/                       # Validation rules
    └── phases/                           # Phase-specific guidance
        ├── analysis.md
        ├── planning.md
        ├── implementation.md
        ├── testing.md
        └── verification.md
```

## Templates

Ready-to-use starter templates are in `src/templates/`. Copy them into your project repo:

```bash
cp -r node_modules/mcp-spec-server/src/templates/. <your-project-root>/
# or copy manually from src/templates/
```

Includes:
- `specs/architecture/rules.md` — project rules (like spec-kit `constitution`)
- `docs/conventions.md` — coding conventions
- `specs/phases/*.md` — phase-specific checklists and guidance
- `CLAUDE.md` — Claude Code integration with `get-context` example
- `.github/copilot-instructions.md` — GitHub Copilot integration

## spec-kit Alignment

[github/spec-kit](https://github.com/github/spec-kit) generates SDD artifacts that
map directly to this server's directory convention:

| spec-kit command | Maps to |
|------------------|---------|
| `/speckit.constitution` | `specs/architecture/rules.md` |
| `/speckit.specify` | `specs/domain/` files |
| `/speckit.plan` | `specs/workflows/` files |
| `/speckit.tasks` + `.implement` | `specs/api/` + `specs/validation/` |
| `/speckit.checklist` | testing + verification phases |

## Storage Modes

- `SPEC_SERVER_MODE=filesystem` (default): read specs directly from files.
- `SPEC_SERVER_MODE=sqlite`: maintain a SQLite index and serve reads from DB.

Environment variables:
- `SPEC_SERVER_SQLITE_PATH` — path to DB file (default: `.mcp-spec-server/specs.db`)
- `SPEC_SERVER_DEFAULT_PROJECT` — default project name
- `SPEC_SERVER_PROJECTS` — multi-project mapping (`name=/abs/path;name2=/abs/path`)

## CLAUDE.md / copilot-instructions.md Example

Add this to your `CLAUDE.md` or `.github/copilot-instructions.md`:

```markdown
Always call `get-context` with the appropriate phase before starting any task:
- analysis: understanding a problem
- planning: designing the solution
- implementation: writing code
- testing: writing or running tests
- verification: final review and acceptance check
```

## SQLite Schema (`specs`)

- `project TEXT`
- `type TEXT` (`api`, `domain`, `workflow`, `validation`, `event`, `rule`)
- `version TEXT` — SHA-256 content hash of the raw file; used as the cache key
- `path TEXT`
- `content TEXT` (JSON-normalized)
- `raw TEXT` (original text)
- `updated_at DATETIME`

On reads in SQLite mode the server checks files and updates changed specs using
SHA-256 hashes. Use `reindex-specs` to force a full refresh.

## Layout

- `src/tools/` — MCP tool registration
- `src/services/` — file loading, search, phase scanning, validation
- `src/templates/` — starter templates for new repos
- `docs/` — human-readable specs (this repo's own docs)
- `specs/` — machine-readable specs (this repo's own specs)

