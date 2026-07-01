import { spawnSync } from 'node:child_process';

const checks = [
  ['npm', ['run', 'build:aoc']],
  ['node', ['scripts/check-package-exports.mjs']],
  ['node', ['scripts/check-compatibility-governance.mjs']],
  ['node', ['scripts/check-lifecycle-integrity.mjs']],
  ['node', ['scripts/check-forbidden-imports.mjs']],
  ['node', ['scripts/check-tarball-purity.mjs']],
  ['node', ['scripts/check-build-reproducibility.mjs']]
];

for (const [cmd, args] of checks) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('[release-readiness] all checks passed');
