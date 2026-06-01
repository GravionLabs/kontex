# Coding Conventions

<!-- Replace this file with your project's coding conventions.
     This file is always loaded by get-context for every workflow phase. -->

## Naming

- Variables and functions: `camelCase`
- Types and classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case`

## Code Style

- Prefer `const` over `let`; never use `var`.
- Keep functions small and focused (≤ 40 lines is a guideline, not a hard limit).
- Avoid deep nesting; prefer early returns and guard clauses.
- No commented-out code in committed files.

## Error Handling

- Never swallow errors silently.
- Use typed error classes for domain errors.
- Return structured errors from public APIs; do not expose internal stack traces.

## Imports

- Use explicit imports; avoid `import *`.
- Group imports: external packages first, then internal modules.
- Use `.js` extensions for ESM local imports.

## Testing

- Unit tests live next to the code they test or in a `tests/` directory.
- Every public function has at least one unit test.
- Tests are deterministic and isolated (no shared state between tests).

## Documentation

- Public APIs have a short summary comment.
- Complex logic has inline comments explaining the *why*, not the *what*.
