# Analysis Phase Context

<!--
  This file is loaded by `get-context` when phase=analysis.
  It guides the AI agent through the analysis phase of a feature or bug investigation.
  Customize it with your team's analysis standards and checklists.
-->

## Goal

Understand the problem space before writing any code. Gather enough context to
make informed decisions in the planning phase.

## Analysis Checklist

- [ ] What is the business problem or user need being addressed?
- [ ] Who are the affected users or systems?
- [ ] What are the acceptance criteria (observable, measurable outcomes)?
- [ ] What are the constraints (technical, compliance, performance)?
- [ ] Are there existing specs, domain models, or API contracts to reference?
- [ ] What are the known unknowns and open questions?
- [ ] What is the blast radius of a wrong decision here?

## Output of Analysis Phase

- A clear problem statement
- A list of acceptance criteria
- Open questions documented and assigned
- Relevant existing specs identified (use `search-specs` or `load-spec` to find them)

## Questions to Ask Before Moving On

1. Can you explain the expected behavior to someone unfamiliar with the system?
2. Are acceptance criteria testable?
3. Have stakeholders confirmed the scope?
