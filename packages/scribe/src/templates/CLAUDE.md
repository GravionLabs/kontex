# CLAUDE.md

This file tells Claude Code how to work with this repository.

## MCP Context Server

This project uses **kontex** — a phase-aware context server — to deliver structured project context to AI agents.
**Always call `get-context` at the start of every task** before writing any code.

### Workflow

1. **Identify your phase**: analysis | planning | implementation | testing | verification
2. **Load context**: call `get-context` with the appropriate phase
3. **Follow the loaded rules**: the server returns architecture rules, conventions, and phase-specific guidance

### Phase Guide

| Phase            | When to use                                              |
|------------------|----------------------------------------------------------|
| `analysis`       | Understanding a problem, exploring existing behavior     |
| `planning`       | Designing the solution, breaking down tasks              |
| `implementation` | Writing code, implementing features or fixes             |
| `testing`        | Writing or running tests, checking coverage              |
| `verification`   | Final review, acceptance criteria check, PR preparation  |

## Commands

```bash
# Build
pnpm build

# Test
pnpm test

# Dev (watch mode)
pnpm dev
```

## Spec Layout

```
specs/
  architecture/rules.md    # Global rules (always loaded)
  domain/                  # Domain entities
  api/                     # API specifications
  workflows/               # Workflow descriptions
  validation/              # Validation rules
  phases/                  # Phase-specific guidance
docs/
  conventions.md           # Coding conventions (always loaded)
  architecture.md          # System architecture overview
```
