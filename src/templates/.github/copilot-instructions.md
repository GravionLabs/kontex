# GitHub Copilot Instructions

This project uses an `mcp-spec-server` to provide structured, phase-aware project context.

## Using get-context

**Always call `get-context` at the start of every task** before writing any code.
This loads the relevant architecture rules, coding conventions, and phase-specific guidance
from the repository's spec documents.

### Phases

| Phase            | Description                                              |
|------------------|----------------------------------------------------------|
| `analysis`       | Understanding a problem, exploring existing behavior     |
| `planning`       | Designing the solution, breaking down tasks              |
| `implementation` | Writing code, implementing features or fixes             |
| `testing`        | Writing or running tests, checking coverage              |
| `verification`   | Final review, acceptance criteria check, PR preparation  |

### Example

When asked to implement a feature:
1. Call `get-context` with `phase=implementation`
2. Review the returned architecture rules, API specs, and validation rules
3. Implement according to those rules

When asked to review or test:
1. Call `get-context` with `phase=testing` or `phase=verification`
2. Check the acceptance criteria and Definition of Done

## Spec Layout

```
specs/architecture/rules.md    # Always loaded — global rules
docs/conventions.md            # Always loaded — coding conventions
specs/phases/<phase>.md        # Phase-specific guidance
specs/domain/                  # Domain entities and models
specs/api/                     # API specifications
specs/workflows/               # Workflow descriptions
specs/validation/              # Validation rules
```
