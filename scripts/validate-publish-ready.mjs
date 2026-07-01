import { spawnSync } from 'node:child_process';

const checks = [
  ['node', ['scripts/check-package-exports.mjs']],
  ['node', ['scripts/check-forbidden-imports.mjs']],
  ['node', ['scripts/check-typescript-package-isolation.mjs']],
  ['node', ['scripts/check-tarball-purity.mjs']],
  ['node', ['scripts/check-build-reproducibility.mjs']],
  ['npm', ['run', 'publish:dry-run']]
];
for (const [cmd, args] of checks) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('[publish] publish-readiness checks passed');
