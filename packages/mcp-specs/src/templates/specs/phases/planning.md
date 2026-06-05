# Planning Phase Context

<!--
  This file is loaded by `get-context` when phase=planning.
  It guides the AI agent through the planning phase.
  Customize it with your team's planning standards.
-->

## Goal

Translate the analysis outputs into a concrete, executable plan with a clear
task breakdown, dependencies identified, and risks mitigated before coding begins.

## Planning Checklist

- [ ] Is the problem statement from the analysis phase finalized?
- [ ] Are all acceptance criteria clear and measurable?
- [ ] Have you identified all affected components and their owners?
- [ ] Have API contracts and domain models been reviewed?
- [ ] Are breaking changes identified and flagged?
- [ ] Have you broken the work into tasks small enough to implement independently?
- [ ] Are task dependencies mapped?
- [ ] Have you identified the riskiest part of the implementation?

## Plan Structure

A good plan includes:

1. **Goal** — one-sentence summary of what will be built
2. **Scope** — what is in/out
3. **Technical approach** — how it will be implemented (key decisions)
4. **Task breakdown** — ordered, independent tasks with clear done criteria
5. **Risks** — what could go wrong and how to mitigate it

## Output of Planning Phase

- A written plan document
- A task list with dependencies
- Any new or updated specs (domain, API, workflow) checked in before coding starts

## Questions to Ask Before Moving On

1. Could a developer start on Task 1 without asking any questions?
2. Are there tasks that block others? Are those ordered correctly?
3. Would the plan survive a technical review?
