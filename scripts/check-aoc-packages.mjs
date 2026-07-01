import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePaths = [
  'src/aoc/protocol/package.json',
  'src/aoc/enterprise/package.json',
];

const required = ['name','version','exports','type','files','license','repository','publishConfig','sideEffects'];
const issues = [];

for (const rel of packagePaths) {
  const full = path.join(root, rel);
  const pkg = JSON.parse(fs.readFileSync(full, 'utf8'));
  for (const field of required) {
    if (!(field in pkg)) issues.push(`${rel}: missing required field '${field}'`);
  }

  if (!pkg.exports || !pkg.exports['.']) issues.push(`${rel}: exports['.'] is required`);
  if (pkg.type !== 'module') issues.push(`${rel}: type must be 'module'`);
  if (!pkg.publishConfig?.registry) issues.push(`${rel}: publishConfig.registry is required`);
  if (!pkg.main) issues.push(`${rel}: main is required for registry portability`);
  if (!pkg.types) issues.push(`${rel}: types is required for TS consumers`);
}

if (issues.length) {
  console.error('AOC package manifest checks failed:\n');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('AOC package manifest checks passed.');
