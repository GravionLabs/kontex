# Testing Phase Context

<!--
  This file is loaded by `get-context` when phase=testing.
  It guides the AI agent through the testing phase.
  Customize it with your team's test strategy and coverage requirements.
-->

## Goal

Validate that the implementation satisfies all acceptance criteria and does not
regress existing behavior.

## Testing Checklist

- [ ] Are all acceptance criteria from the analysis phase covered by tests?
- [ ] Are unit tests written for every new function with non-trivial logic?
- [ ] Are integration tests written for new API endpoints or service interactions?
- [ ] Are edge cases and error paths explicitly tested?
- [ ] Are tests deterministic and isolated (no shared state, no order dependency)?
- [ ] Does the test suite pass cleanly (no skipped, pending, or flaky tests)?
- [ ] Is coverage sufficient for the changed paths?

## Test Types

| Type        | Scope                          | When Required                          |
|-------------|--------------------------------|----------------------------------------|
| Unit        | Single function or class       | All non-trivial logic                  |
| Integration | Multiple layers or services    | Service interactions, DB, external APIs |
| E2E         | Full user-facing flow          | Critical paths and acceptance criteria |

## Test Naming Convention

Tests should follow: `<unit> <behavior> <expected outcome>`

Example: `createTicket with invalid priority returns 400`

## Output of Testing Phase

- All tests passing
- Coverage report reviewed
- Test plan or test summary documented if required by team process
