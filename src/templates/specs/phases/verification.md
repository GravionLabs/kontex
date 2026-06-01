# Verification Phase Context

<!--
  This file is loaded by `get-context` when phase=verification.
  It guides the AI agent through the final verification / acceptance check.
  Customize it with your team's Definition of Done and release standards.
-->

## Goal

Confirm that the delivered implementation meets all acceptance criteria, domain
rules, and quality gates before merging or releasing.

## Verification Checklist

- [ ] All acceptance criteria from the analysis phase are demonstrably met.
- [ ] Domain model is consistent with the implementation (no drift from `specs/domain/`).
- [ ] All validation rules in `specs/validation/` are enforced and tested.
- [ ] No regressions: all previously passing tests still pass.
- [ ] Code review completed and all comments resolved.
- [ ] Documentation updated (API docs, README, changelogs).
- [ ] No open TODO, FIXME, or HACK comments in changed code.
- [ ] Secrets and credentials are not exposed.
- [ ] Deployment instructions updated if infrastructure changed.

## Definition of Done

A feature is DONE when:

1. Acceptance criteria are met and verified by tests.
2. Code is reviewed and approved.
3. Tests pass on CI.
4. Docs are updated.
5. No blocking issues remain.

## Output of Verification Phase

- Sign-off on the acceptance criteria
- PR approved and merged
- Any post-release monitoring tasks created
