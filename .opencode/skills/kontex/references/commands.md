# Commands

## Workspace root

| Command | Description |
|---|---|
| `pnpm build` | Compile all packages |
| `pnpm dev` | Watch mode all packages |
| `pnpm test` | Run all tests once |
| `pnpm test:watch` | Vitest watch |
| `pnpm check` | Biome lint + format + organize imports |

## Per-package

```bash
pnpm --filter @gravionlabs/kontex-scribe build
pnpm --filter @gravionlabs/kontex-scribe test
pnpm --filter @gravionlabs/kontex-scribe dev
```

## Single test file

```bash
npx vitest run tests/sqlite-store.test.ts
npx vitest run tests/chunk-utils.test.ts
```

## Publish (dry-run)

```bash
pnpm --filter @gravionlabs/kontex-<name> publish --dry-run
```
