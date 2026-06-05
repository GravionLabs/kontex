---
name: angular-developer
description: >
  Generates Angular code and provides architectural guidance. Use this skill when
  creating projects, components, or services, or for best practices on reactivity
  (signals, linkedSignal, resource), forms, dependency injection, routing, SSR,
  accessibility (ARIA), animations, styling (component styles, Tailwind CSS),
  testing, or CLI tooling.
allowed-tools: execute shell runCommands read write edit editFiles search codebase
license: MIT
model: claude-sonnet-4.6
chronicle-hints: 'single-purpose, structured-output, phases'
metadata:
  author: Copyright 2026 Google LLC
  version: '1.0'
---

# Angular Developer Guidelines

## Overview

This skill provides comprehensive guidance for Angular development across all common tasks: project creation, components, reactivity (signals), forms, dependency injection, routing, accessibility, styling, animations, and testing.

**Key principle:** Always analyze the project's Angular version first — best practices vary significantly between versions.

## Prerequisites

- Angular project or intent to create one
- Familiarity with TypeScript (recommended but not required)
- Angular CLI installed (or willingness to use `npx`)

## Steps

### Phase 1 — Analyze & Prepare

✓ Checkpoint: Project environment understood; version confirmed; references loaded

1. **Analyze project version:**
   - If working with existing project: run `ng version` to determine Angular version
   - If creating new project: determine if user specified a version
   - Load appropriate references based on version and task

2. **Load task-specific references:**
   - **Project creation:** Start with project scaffolding guidance. Read form references only if the user asks to scaffold forms or the initial feature set clearly includes forms. In that case, load [references/reactive-forms.md](references/reactive-forms.md), [template-driven-forms.md](references/template-driven-forms.md), then [signal-forms.md](references/signal-forms.md) only if the user explicitly asks for Signal Forms or the project already uses `@angular/forms/signals`
   - **Components:** Read [references/components.md](references/components.md), [inputs.md](references/inputs.md), [outputs.md](references/outputs.md), [host-elements.md](references/host-elements.md)
   - **Reactivity:** Read [references/signals-overview.md](references/signals-overview.md), [linked-signal.md](references/linked-signal.md), [resource.md](references/resource.md), [effects.md](references/effects.md)
   - **Forms:** Read [references/reactive-forms.md](references/reactive-forms.md), [template-driven-forms.md](references/template-driven-forms.md), then [signal-forms.md](references/signal-forms.md) only for an explicit Signal-Forms task or an existing Signal-Forms codebase
   - **DI:** Read [references/di-fundamentals.md](references/di-fundamentals.md), [creating-services.md](references/creating-services.md), [defining-providers.md](references/defining-providers.md), [injection-context.md](references/injection-context.md), [hierarchical-injectors.md](references/hierarchical-injectors.md)
   - **Accessibility:** Read [references/angular-aria.md](references/angular-aria.md)
   - **Routing:** Read [references/routing-index.md](references/routing-index.md) for topic selection. If the task is routing-specific, read the relevant direct references: [define-routes.md](references/define-routes.md), [loading-strategies.md](references/loading-strategies.md), [show-routes-with-outlets.md](references/show-routes-with-outlets.md), [navigate-to-routes.md](references/navigate-to-routes.md), [route-guards.md](references/route-guards.md), [data-resolvers.md](references/data-resolvers.md), [router-lifecycle.md](references/router-lifecycle.md), [rendering-strategies.md](references/rendering-strategies.md), [route-animations.md](references/route-animations.md)
   - **Styling:** Read [references/tailwind-css.md](references/tailwind-css.md), [component-styling.md](references/component-styling.md), [angular-animations.md](references/angular-animations.md)
   - **Testing:** Read [references/testing-vitest.md](references/testing-vitest.md) for Angular v21+ or [testing-jest.md](references/testing-jest.md) for Angular v20 and earlier, plus task-specific: [testing-fundamentals.md](references/testing-fundamentals.md), [component-harnesses.md](references/component-harnesses.md), [router-testing.md](references/router-testing.md), [e2e-testing.md](references/e2e-testing.md)
   - **Tooling:** Read [references/cli.md](references/cli.md), [mcp.md](references/mcp.md)

### Phase 2 — Generate Code

✓ Checkpoint: Code scaffolded and generated; all CLI commands executed successfully

3. **Execute scaffolding or generation:**
   - Use Angular CLI (`ng new`, `ng generate`, etc.) for all code creation
   - Follow version-appropriate patterns from loaded references
   - Apply Angular style guide and best practices

4. **For project creation specifically:**
   - **Step 1 — Check version:** If user requests specific version, use `npx @angular/cli@<version> new <project-name>`
   - **Step 2 — Check local install:** If no version specified, run `ng version` to detect local installation
   - **Step 3 — Fallback:** If `ng version` fails, use `npx @angular/cli@latest new <project-name>`

5. **For component/service/other generation:**
   - Use local CLI: `ng generate component <name>` or similar
   - Ensure project structure follows Angular conventions

### Phase 3 — Build & Validate

✓ Checkpoint: Build successful; generated code is correct and functional

6. **Build to catch errors early:**
   - Run `ng build` immediately after code generation
   - Prefer the smallest useful output; if the workspace/version supports a quiet or progress-suppressed build flag, use it
   - Analyze any build errors and fix before proceeding
   - **Do not skip this step** — it ensures code is correct

7. **Run tests (if applicable):**
   - Determine test runner: Vitest (v21+, recommended) or Jest (v20 and earlier)
   - Write tests during development
   - Prefer `npm --silent run test` to avoid npm wrapper noise; use watch mode only when the user explicitly wants an interactive test session

8. **Prepare the response:**
   - If you are ready to present the outcome, read [assets/output-template.md](assets/output-template.md)
   - Fill in only the sections that match the work you actually completed

## Architecture Guides by Topic

### Creating New Projects
- Default: Latest stable Angular (unless user specifies)
- Forms: Do not assume forms are part of project creation. If forms are in scope, default to Reactive Forms; use Template-driven Forms for simple template-led cases; use Signal Forms only when explicitly requested or already adopted in the codebase
- Follow "Execution Rules" in Phase 2, Step 4

### Components
- Anatomy, metadata, core concepts, template control flow
- Signal-based inputs, transforms, model inputs
- Signal-based outputs and custom events
- Host bindings and attribute injection
- See: [references/components.md](references/components.md) and related files

### Reactivity & Data Management
- Use Angular Signals (`signal`, `computed`, `linkedSignal`, `resource`)
- Understand reactive contexts and `untracked`
- Use `effect` for side effects (logging, DOM manipulation)
- Know when NOT to use effects
- See: [references/signals-overview.md](references/signals-overview.md) and related files

### Forms
- **Preference:** Reactive Forms by default
- **Alternative:** Template-driven Forms for simple template-led forms
- **Opt-in:** Signal Forms only when the user explicitly requests them or the project already uses them
- Analyze project and choose appropriate strategy
- See: [references/reactive-forms.md](references/reactive-forms.md), [template-driven-forms.md](references/template-driven-forms.md), and [signal-forms.md](references/signal-forms.md) when needed

### Dependency Injection
- Use `inject()` function (modern) over constructor injection
- Services: use `providedIn: 'root'` for tree-shakability
- `InjectionToken` for custom providers
- Hierarchical injectors: `EnvironmentInjector` vs `ElementInjector`
- Modifiers: `optional`, `skipSelf`
- See: [references/di-fundamentals.md](references/di-fundamentals.md) and related files

### Accessibility (ARIA)
- Use Angular Aria components for headless, accessible patterns
- Supported: Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid
- Style ARIA attributes properly
- See: [references/angular-aria.md](references/angular-aria.md)

### Routing
- Comprehensive routing guide covers: route definition, loading strategies, outlets, guards, resolvers, lifecycle events, rendering strategies, animations
- See: [references/routing-index.md](references/routing-index.md) for the overview, then load the direct routing references named in Phase 1, Step 2

### Styling & Animations
- **Tailwind CSS:** Integrating with Angular projects
- **Animations:** Use native CSS (recommended) or legacy DSL
- **Component styles:** Best practices and encapsulation
- See: [references/tailwind-css.md](references/tailwind-css.md), [component-styling.md](references/component-styling.md), [angular-animations.md](references/angular-animations.md)

### Testing
- **Choose test runner:** Vitest (v21+, recommended) or Jest (v20 and earlier)
- **Patterns:** TestBed, component fixtures, async patterns (`fakeAsync`, `tick`), mocking, HTTP testing
- **Component harnesses:** Robust interaction and testing
- **Router testing:** Use `RouterTestingHarness`
- **E2E:** Best practices with Cypress
- See: [references/testing-vitest.md](references/testing-vitest.md) and related files

### Tooling
- **Angular CLI:** Creating apps, generating code, serving, building
- **Angular MCP Server:** Tools, configuration, experimental features
- See: [references/cli.md](references/cli.md), [mcp.md](references/mcp.md)

## Gotchas

- **Always run `ng build` after generation** — don't skip this; it catches errors early
- `ng version` may fail on systems without global Angular CLI — fall back to `npx @angular/cli@latest`
- **Don't throw errors in tests** — use TestBed.flushEffects() when testing Signals
- **Test choice matters:** Vitest for modern Angular (v21+), Jest for legacy
- Signal Forms are opt-in guidance here; do not assume them unless the user or codebase already points to `@angular/forms/signals`

## Output Format

If you are preparing the final response, read [assets/output-template.md](assets/output-template.md).
Use that template and keep the response focused on Angular version, generated artifacts, and build/test status.
