import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const enterpriseSrcDir = 'src/aoc/enterprise';
const enterpriseRuntimeDir = join(enterpriseSrcDir, 'runtime');
const enterpriseDistDir = join(enterpriseSrcDir, 'dist');

function walk(dir, predicate, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[isolation] ${message}`);
    process.exit(1);
  }
}

const sourceFiles = walk(enterpriseRuntimeDir, (p) => p.endsWith('.ts'));
const forbiddenSourceImports = [];
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  const importStatements = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  if (importStatements.some((spec) => /^(?:\.\.\/)+protocol/.test(spec) || spec === '@/aoc/protocol' || spec.startsWith('src/aoc/protocol'))) {
    forbiddenSourceImports.push(`${file}: forbidden protocol source import`);
  }
  if (importStatements.some((spec) => /^(?:\.\.\/)+runtime\/adapters/.test(spec) || spec.startsWith('src/aoc/runtime/adapters'))) {
    forbiddenSourceImports.push(`${file}: forbidden host adapter registry import`);
  }
}
assert(forbiddenSourceImports.length === 0, `enterprise source contains forbidden imports:\n${forbiddenSourceImports.join('\n')}`);

const distFiles = walk(enterpriseDistDir, (p) => p.endsWith('.d.ts') || p.endsWith('.js'));
const forbiddenDistRefs = [];
for (const file of distFiles) {
  const content = readFileSync(file, 'utf8');
  if (content.includes('../../protocol') || content.includes('../protocol') || content.includes('dist/protocol/') || content.includes('dist/aoc/protocol/')) {
    forbiddenDistRefs.push(`${file}: contains protocol artifact path reference`);
  }
}
assert(forbiddenDistRefs.length === 0, `enterprise dist contains protocol path references:\n${forbiddenDistRefs.join('\n')}`);

const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: enterpriseSrcDir,
  encoding: 'utf8',
});
assert(pack.status === 0, `npm pack failed for enterprise package:\n${pack.stderr || pack.stdout}`);

const packed = JSON.parse(pack.stdout)[0];
const tarballFiles = packed.files.map((f) => f.path);
const tarballLeaks = tarballFiles.filter((f) => /dist\/.*protocol\//.test(f) || /dist\/aoc\/protocol\//.test(f));
assert(tarballLeaks.length === 0, `enterprise tarball contains protocol artifacts:\n${tarballLeaks.join('\n')}`);

console.log('[isolation] TypeScript package isolation checks passed');
