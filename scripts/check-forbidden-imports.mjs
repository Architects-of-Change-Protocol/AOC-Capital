import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetDir = path.join(root, 'src/aoc/enterprise');
const forbidden = [
  /from\s+['"]\.\.\/\.\.\/protocol\//,
  /from\s+['"]@\/aoc\/protocol\//,
  /from\s+['"][^'"]*src\/aoc\/protocol\//
];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'dist' || e.name === 'node_modules') continue;
      out.push(...walk(p));
    } else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

let failed = false;
for (const file of walk(targetDir)) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, idx) => {
    if (forbidden.some((r) => r.test(line))) {
      console.error(`[boundary] forbidden protocol source import in ${path.relative(root, file)}:${idx + 1}`);
      failed = true;
    }
  });
}
if (failed) process.exit(1);
console.log('[boundary] no forbidden source-level protocol imports found in enterprise runtime');
