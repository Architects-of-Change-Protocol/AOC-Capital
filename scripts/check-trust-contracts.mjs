import { readFileSync } from 'node:fs';
const c = readFileSync(new URL('../src/lib/security/trust-coordination.ts', import.meta.url), 'utf8');
if (!c.includes('verifyTrustEventSequence') || !c.includes('registerRevocationFromEvent')) {
  console.error('[check:trust-contracts] expected trust coordination APIs missing.');
  process.exit(1);
}
console.log('[check:trust-contracts] trust coordination contract surface verified.');
