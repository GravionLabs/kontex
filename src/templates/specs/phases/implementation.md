# Implementation Phase Context

<!--
  This file is loaded by `get-context` when phase=implementation.
  It reminds the AI agent of the coding rules and patterns to follow during implementation.
  Customize it with your project's implementation standards.
-->

## Goal

Implement the planned tasks according to architecture rules, API specs, validation
rules, and workflow definitions — without deviation from the agreed plan.

## Implementation Checklist

- [ ] Is the plan from the planning phase complete and approved?
- [ ] Have all relevant specs been loaded (`get-context phase=implementation`)?
- [ ] Are new functions/methods covered by unit tests?
- [ ] Does the implementation match the API spec exactly?
- [ ] Are all validation rules enforced at the correct layer?
- [ ] Are error cases handled explicitly?
- [ ] Are there no hardcoded secrets or environment-specific values?
- [ ] Does the code pass linting and type checking?

## Implementation Standards

Follow the conventions in `docs/conventions.md` and architecture rules in
`specs/architecture/rules.md`. Both are loaded automatically with this phase.

### Task Discipline

- Implement one task at a time.
- Do not start the next task until the current one passes tests.
- Do not refactor unrelated code during implementation (separate PR/commit).

### Commit Standards

- Atomic commits: one logical change per commit.
- Commit messages describe *what* changed and *why* (not *how*).
- Reference the spec or task ID where applicable.

## Output of Implementation Phase

- Working implementation with passing tests
- Updated specs if behavior was refined during implementation
- No regressions in existing tests
