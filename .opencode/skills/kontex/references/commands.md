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
pnpm --filter @gravionlabs/kontex-herald build
pnpm --filter @gravionlabs/kontex-oracle build
pnpm --filter @gravionlabs/kontex-compress build
```

## Single test file

```bash
npx vitest run tests/sqlite-store.test.ts
npx vitest run tests/chunk-utils.test.ts
```

## oracle CLI

```bash
# Recommend model from issue title + body
oracle recommend-model --title "feat: add search" --body "Needs FTS5 indexing..."
oracle recommend-model --title "fix: typo" --provider opencode
oracle recommend-model --title "..." --json        # JSON output for CI
```

## compress CLI

```bash
kontex-compress <file>           # compress a file to stdout
echo "long text..." | kontex-compress --level ultra
```

## opencode plugin tests

```bash
cd .opencode && npx vitest run plugin/kontex.test.ts
```

## Publish (dry-run)

```bash
pnpm --filter @gravionlabs/kontex-<name> publish --dry-run
```
