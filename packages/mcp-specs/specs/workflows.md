# Workflows

## Authoring workflow
1. Add or update content in `docs/` or `specs/`.
2. Run `search-specs` to verify discoverability.
3. Run `load-spec` to inspect the final file.

## Support workflow
1. Use `teams-context` for operational guidance.
2. Escalate any unclear rule conflicts to the owning team.

## Compression workflow
1. Extract prompt/skill/agent text.
2. Call `compress-artifact` with `kind` (prompt|skill|agent) and `content`.
3. Review compressed output and metrics.
4. Use compressed text in production or further processing.
