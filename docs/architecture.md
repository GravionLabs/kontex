# Architecture

The server is intentionally small:

1. `src/tools/` registers MCP tools.
2. `src/services/` owns file access, validation, and context extraction.
3. `docs/` contains human-readable guidance.
4. `specs/` contains machine-readable source material.

The runtime transport is stdio only.

## Storage backends

- `filesystem` backend reads docs/specs directly from the selected project root.
- `sqlite` backend keeps a central multi-project index and serves reads from SQLite.

SQLite index refresh uses per-file SHA-256 hashes to avoid unnecessary updates.
