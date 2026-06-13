# Environment Variables

All read in `ProjectRegistry.loadProjectConfig()`.

| Variable | Default | Description |
|---|---|---|
| `SPEC_SERVER_MODE` | `sqlite` | `sqlite` or `filesystem` |
| `SPEC_SERVER_DEFAULT_PROJECT` | directory basename | Default project name |
| `SPEC_SERVER_SQLITE_PATH` | `.kontex/specs.db` | SQLite database path |
| `SPEC_SERVER_PROJECTS` | — | Multi-project mapping: `name=/abs/path;name2=/abs/path` |
