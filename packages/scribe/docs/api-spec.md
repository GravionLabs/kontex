# API Spec

This MCP server exposes specification-oriented tools:

- `list-specs` for file discovery
- `load-spec` for file retrieval
- `search-specs` for content search
- `teams-context` for dynamic support context
- `compress-artifact` for compressing prompts, skills, and agent descriptions
- `reindex-specs` for explicit SQLite refresh

All tools support an optional `project` parameter in multi-project setups.
