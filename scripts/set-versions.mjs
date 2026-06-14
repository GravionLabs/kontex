import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(root, '..', 'packages');

for (const dir of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, dir, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.private === true) continue;
    pkg.version = process.env.VERSION;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch {
    // skip non-package directories
  }
}
