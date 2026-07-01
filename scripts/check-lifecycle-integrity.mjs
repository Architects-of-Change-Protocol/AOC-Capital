import fs from 'node:fs';

const docs = [
  'docs/security/trust-policy-lifecycle.md',
  'docs/security/replay-protection.md',
  'docs/security/governance-runtime.md'
];
for (const path of docs) {
  if (!fs.existsSync(path)) {
    console.error(`[lifecycle] missing required lifecycle document: ${path}`);
    process.exit(1);
  }
}
console.log('[lifecycle] lifecycle governance documentation and guardrails are present');
