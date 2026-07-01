import fs from 'node:fs';

const requiredDocs = ['docs/release/compatibility-governance.md'];
const requiredExports = [
  ['src/aoc/protocol/package.json', ['.', './contracts']],
  ['src/aoc/enterprise/package.json', ['.', './runtime']]
];

for (const doc of requiredDocs) {
  if (!fs.existsSync(doc)) {
    console.error(`[compatibility] missing doc: ${doc}`);
    process.exit(1);
  }
}

for (const [manifestPath, keys] of requiredExports) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const key of keys) {
    if (!manifest.exports?.[key]) {
      console.error(`[compatibility] ${manifestPath} missing export ${key}`);
      process.exit(1);
    }
  }
}
console.log('[compatibility] governance checks passed');
