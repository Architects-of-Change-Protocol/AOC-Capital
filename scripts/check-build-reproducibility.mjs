import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const targets = ['src/aoc/protocol/dist', 'src/aoc/enterprise/dist'];

function hashDir(dir) {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  files.sort();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(path.relative(process.cwd(), f));
    h.update(fs.readFileSync(f));
  }
  return h.digest('hex');
}

const runBuild = () => {
  const r = spawnSync('npm', ['run', 'build:aoc'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

runBuild();
const first = targets.map(hashDir);
runBuild();
const second = targets.map(hashDir);
if (first.some((h, i) => h !== second[i])) {
  console.error('[repro] dist output hash drift detected between consecutive builds');
  process.exit(1);
}
console.log('[repro] deterministic AOC dist outputs confirmed');
