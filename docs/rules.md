# Rules

## File rules
- Only `docs/` and `specs/` are exposed.
- Allowed extensions: `.md`, `.markdown`, `.yaml`, `.yml`, `.json`.
- Path traversal is rejected.
- Project selection is restricted to configured project names.

## Validation rules
- Tool inputs are validated with `zod`.
- Search queries must be at least two characters long.

## Teams Context
- Support-related context is collected from docs that mention teams, support, or escalation.
- When no topic is provided, the scanner prefers headings and sections that look operational.

## SQLite indexing
- In `SPEC_SERVER_MODE=sqlite`, specs are normalized into a shared `specs` table.
- Each row stores `project`, `type`, `version`, `path`, `content`, `raw`, and `updated_at`.
- File hashes are used to update only changed specs during reindex.
