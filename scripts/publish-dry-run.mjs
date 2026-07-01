import { spawnSync } from 'node:child_process';

for (const dir of ['src/aoc/protocol', 'src/aoc/enterprise']) {
  const r = spawnSync('npm', ['pack', '--dry-run'], { cwd: dir, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('[publish] npm pack dry-run succeeded for all AOC packages');
