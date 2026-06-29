# Plan: Epic #66 — Deploy stage + deploy spec type

Branch: `feature/66-deploy-phase` (already created)

## Sub-issue #72 — Add `deploy` phase to spec-types + get-context

### `packages/scribe/src/services/spec-types.ts`

**Line 8** — extend `WorkflowPhase`:
```ts
// before
export type WorkflowPhase = 'analysis' | 'planning' | 'implementation' | 'testing' | 'verification';
// after
export type WorkflowPhase = 'analysis' | 'planning' | 'implementation' | 'testing' | 'verification' | 'deploy';
```

**Line 11** — append to `WORKFLOW_PHASES`:
```ts
// before
export const WORKFLOW_PHASES: WorkflowPhase[] = ['analysis', 'planning', 'implementation', 'testing', 'verification'];
// after
export const WORKFLOW_PHASES: WorkflowPhase[] = ['analysis', 'planning', 'implementation', 'testing', 'verification', 'deploy'];
```

**Lines 15-21** — add `deploy` entry to `PHASE_SPEC_DIRS`:
```ts
export const PHASE_SPEC_DIRS: Record<WorkflowPhase, string[]> = {
  analysis: ['specs/architecture', 'specs/domain'],
  planning: ['specs/architecture', 'specs/domain', 'specs/api'],
  implementation: ['specs/architecture', 'specs/api', 'specs/validation', 'specs/workflows'],
  testing: ['specs/validation', 'specs/workflows'],
  verification: ['specs/domain', 'specs/validation'],
  deploy: ['specs/architecture', 'specs/deploy', 'specs/validation'],  // ADD
};
```

### `packages/scribe/src/tools/get-context.ts`

**Lines 21-23** — update description string (Zod enum derives from WORKFLOW_PHASES automatically):
```ts
// before
'Workflow phase: analysis | planning | implementation | testing | verification. ' +
  'Each phase loads a different set of spec directories.',
// after
'Workflow phase: analysis | planning | implementation | testing | verification | deploy. ' +
  'Each phase loads a different set of spec directories.',
```

### `packages/scribe/tests/services.test.ts`

Add new `describe('WorkflowPhase and PHASE_SPEC_DIRS', ...)` block after line 127:
```ts
import { PHASE_SPEC_DIRS, WORKFLOW_PHASES } from '../src/services/spec-types.js';

describe('WorkflowPhase and PHASE_SPEC_DIRS', () => {
  it('WORKFLOW_PHASES includes deploy', () => {
    expect(WORKFLOW_PHASES.includes('deploy')).toBe(true);
  });

  it('deploy is the last phase', () => {
    expect(WORKFLOW_PHASES[WORKFLOW_PHASES.length - 1]).toBe('deploy');
  });

  it('PHASE_SPEC_DIRS.deploy has correct directories', () => {
    expect(PHASE_SPEC_DIRS['deploy']).toEqual([
      'specs/architecture',
      'specs/deploy',
      'specs/validation',
    ]);
  });
});
```

**Commit:** `feat(scribe): add deploy phase to WorkflowPhase, WORKFLOW_PHASES, PHASE_SPEC_DIRS (#72)`

---

## Sub-issue #73 — Add `deploy` SpecType + detectSpecType keywords

### `packages/scribe/src/services/spec-types.ts`

**Line 6** — extend `SpecType`:
```ts
// before
export type SpecType = 'api' | 'domain' | 'workflow' | 'validation' | 'event' | 'rule';
// after
export type SpecType = 'api' | 'domain' | 'workflow' | 'validation' | 'event' | 'rule' | 'deploy';
```

**Lines 92-103** — add deploy path check before the `api`/yaml fallback block:
```ts
  if (lowerPath.includes('rule')) {
    return 'rule';
  }

  // ADD: deploy path check must be before yaml → api fallback
  if (
    lowerPath.includes('deploy') ||
    lowerPath.includes('runbook') ||
    lowerPath.includes('infra')
  ) {
    return 'deploy';
  }

  if (
    lowerPath.includes('api') ||
    lowerPath.includes('endpoint') ||
    lowerPath.endsWith('.yaml') ||
    lowerPath.endsWith('.yml')
  ) {
    return 'api';
  }
```

**Lines 117-122** — add deploy content check before the final `return 'api'`:
```ts
  if (lowerContent.includes('rule')) {
    return 'rule';
  }

  // ADD
  if (lowerContent.includes('runbook') || lowerContent.includes('deployment')) {
    return 'deploy';
  }

  return 'api';
```

### `packages/scribe/tests/services.test.ts`

Add tests inside the existing `describe('summarizeContent', ...)` or a new `describe('detectSpecType', ...)` block:
```ts
import { detectSpecType, PHASE_SPEC_DIRS, WORKFLOW_PHASES } from '../src/services/spec-types.js';

describe('detectSpecType', () => {
  it('specs/deploy/runbook.md returns deploy', () => {
    expect(detectSpecType('specs/deploy/runbook.md', '')).toBe('deploy');
  });

  it('specs/infra/helm.yaml returns deploy', () => {
    expect(detectSpecType('specs/infra/helm.yaml', '')).toBe('deploy');
  });

  it('content with runbook keyword returns deploy', () => {
    expect(detectSpecType('some/file.md', 'This is a runbook for deployment')).toBe('deploy');
  });

  it('specs/api/users.yaml still returns api (no regression)', () => {
    expect(detectSpecType('specs/api/users.yaml', '')).toBe('api');
  });

  it('plain yaml with no deploy keyword returns api', () => {
    expect(detectSpecType('specs/endpoints.yaml', '')).toBe('api');
  });
});
```

**Commit:** `feat(scribe): add deploy SpecType and detectSpecType keywords (#73)`

---

## Sub-issue #74 — Add `deploy: 'lite'` to PHASE_COMPRESSION_MAP

### `packages/types/src/compression-mode.ts`

**Lines 4-10** — add deploy entry:
```ts
export const PHASE_COMPRESSION_MAP: Record<string, CompressionLevel> = {
  analysis: 'lite',
  planning: 'full',
  implementation: 'ultra',
  testing: 'full',
  verification: 'lite',
  deploy: 'lite',  // ADD
};
```

### `packages/types/tests/compression-mode.test.ts`

Add inside `describe('PHASE_COMPRESSION_MAP', ...)` after the `verification` test (line 80):
```ts
  it('maps deploy to lite', () => {
    expect(PHASE_COMPRESSION_MAP.deploy).toBe('lite');
  });
```

Add inside `describe('CompressionModeStore', ...)` after `getEffectiveLevel returns full for unknown phase`:
```ts
  it('getEffectiveLevel returns lite for deploy phase when level is off', () => {
    const store = new CompressionModeStore();
    expect(store.getEffectiveLevel('deploy')).toBe('lite');
  });
```

**Commit:** `feat(types): add deploy: 'lite' to PHASE_COMPRESSION_MAP (#74)`

---

## Final verification

```bash
pnpm -r build
pnpm test
pnpm check
```

## PR

Title: `feat: add deploy phase and deploy spec type (#66)`

Body:
```
Closes #66
Closes #72
Closes #73
Closes #74

## Changes
- `WorkflowPhase` union + `WORKFLOW_PHASES` + `PHASE_SPEC_DIRS` extended with `deploy` (#72)
- `SpecType` union + `detectSpecType` extended with `deploy` keywords (#73)
- `PHASE_COMPRESSION_MAP` extended with `deploy: 'lite'` (#74)
```
