# Architecture Rules

<!-- Replace this file with the governing principles for your project.
     This file is always loaded by get-context for every workflow phase. -->

## Core Principles

- **Separation of concerns**: each module has a single, well-defined responsibility.
- **Explicit over implicit**: configuration and dependencies are declared, not inferred.
- **Fail fast**: validate inputs at system boundaries; surface errors early.
- **No magic**: avoid hidden behavior, global side effects, or implicit coupling.

## Layer Boundaries

Describe your layers here (e.g., API → Service → Repository → DB).
Dependencies only flow inward. Inner layers must not know about outer layers.

## Technology Constraints

- List approved libraries, runtimes, or frameworks here.
- List anything that must NOT be used and why.

## Security Rules

- All user input is validated and sanitized at entry points.
- Secrets are read from environment variables, never hardcoded.
- Authentication is verified before any protected resource is accessed.

## Performance Budgets

- Define SLA targets (e.g., p99 latency, max payload size).
- Define any caching or batching requirements.
