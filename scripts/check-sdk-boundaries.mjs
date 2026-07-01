import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const required = ['@aoc-enterprise/runtime', '@aoc/protocol'];
const missing = required.filter((k) => !pkg.dependencies?.[k]);
if (missing.length) {
  console.error('[check:sdk-boundaries] missing required SDK package dependencies:', missing.join(', '));
  process.exit(1);
}
console.log('[check:sdk-boundaries] sdk boundary dependency surface is intact.');
