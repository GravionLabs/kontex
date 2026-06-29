# Environment Variables

## Shared

| Variable | Default | Description |
|---|---|---|
| `KONTEX_DB_PATH` | `.kontex/kontex.db` | Path to the unified SQLite database (used by both scribe and herald/plugin) |
| `KONTEX_AUTOLOAD_CONTEXT` | `false` | Set `true` to auto-call scribe `get-context` on opencode session start |

## Scribe (spec server)

Read in `ProjectRegistry.loadProjectConfig()`.

| Variable | Default | Description |
|---|---|---|
| `SPEC_SERVER_MODE` | `sqlite` | `sqlite` or `filesystem` |
| `SPEC_SERVER_DEFAULT_PROJECT` | directory basename | Default project name |
| `SPEC_SERVER_PROJECTS` | — | Multi-project mapping: `name=/abs/path;name2=/abs/path` |
