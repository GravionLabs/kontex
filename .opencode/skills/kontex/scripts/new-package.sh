#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <package-name>"
  exit 1
fi

NAME="$1"
DIR="packages/$NAME"

if [ -d "$DIR" ]; then
  echo "Error: $DIR already exists"
  exit 1
fi

mkdir -p "$DIR/src" "$DIR/tests"

cat > "$DIR/package.json" <<EOF
{
  "name": "@kontex/$NAME",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "pnpm@11.5.0",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:ci": "vitest run --coverage",
    "check": "biome check --write src/"
  }
}
EOF

cat > "$DIR/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > "$DIR/src/index.ts" <<EOF
export const name = '@kontex/$NAME';
EOF

echo "Created $DIR"
echo "Next: pnpm install"
