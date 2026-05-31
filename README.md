# mcp-spec-server

TypeScript MCP server for specification docs.

## Tools
- `list-specs`
- `load-spec`
- `search-specs`
- `teams-context`
- `reindex-specs` (SQLite mode)

## Run
```bash
npm install
npm run dev
```

## Storage modes
- `SPEC_SERVER_MODE=filesystem` (default): read specs directly from files.
- `SPEC_SERVER_MODE=sqlite`: maintain a SQLite index and serve reads from DB.

Optional environment variables:
- `SPEC_SERVER_SQLITE_PATH` path to DB file (default: `.mcp-spec-server/specs.db`)
- `SPEC_SERVER_DEFAULT_PROJECT` default project name
- `SPEC_SERVER_PROJECTS` multi-project mapping (`name=/abs/path;name2=/abs/path`)

In SQLite mode, every tool accepts optional `project`. Without it, the default project is used.

## SQLite schema (`specs`)
- `id INTEGER PRIMARY KEY`
- `project TEXT`
- `type TEXT` (`api`, `domain`, `workflow`, `validation`, `event`, `rule`)
- `version TEXT` (SemVer or Git hash fallback)
- `path TEXT`
- `content TEXT` (JSON-normalized YAML/MD)
- `raw TEXT` (original text)
- `updated_at DATETIME`

## Reindexing and hash updates
- On reads in SQLite mode, the server checks files and updates changed specs using SHA-256 hashes.
- Use `reindex-specs` to refresh one project or all configured projects explicitly.

## Spec Kit (optional)
Spec Kit is supported as a process layer (spec/plan/tasks workflow), not a runtime dependency.
Its artifacts can be ingested into `specs` by mapping document semantics to `type`, `version`, `content`, and `raw`.

Suggested mapping:
- `spec.md` -> `type=domain` or `type=api` (depending on content)
- `plan.md` -> `type=workflow`
- `tasks.md` -> `type=validation`

## Layout
- `src/tools/` MCP tool registration
- `src/services/` file loading, search, validation, and context scanning
- `docs/` human-readable specs
- `specs/` machine-readable specs
