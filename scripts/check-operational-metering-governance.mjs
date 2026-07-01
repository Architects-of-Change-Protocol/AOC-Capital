import { readFileSync, existsSync } from 'node:fs';

const required = [
  'src/features/trial/metering/domain/metering-types.ts',
  'src/features/trial/metering/services/metering-service.ts',
  'src/features/trial/metering/policies/consumption-policies.ts',
  'src/features/trial/metering/utils/replay-safe.ts',
  'docs/architecture/operational-metering-engine.md',
  'src/features/trial/metering/state/metering-state.ts',
  'src/features/trial/metering/reconciliation/reconciliation.ts',
];
for (const p of required) if (!existsSync(p)) throw new Error(`Missing metering governance path: ${p}`);

const fileContents = Object.fromEntries(required.map((p) => [p, readFileSync(p, 'utf8').toLowerCase()]));
const merged = Object.values(fileContents).join('\n');
for (const forbidden of ['stripe billing', 'invoice', 'openai token cost', 'anthropic token']) {
  if (merged.includes(forbidden)) throw new Error(`Forbidden coupling detected: ${forbidden}`);
}
for (const requiredTerm of ['replaysafehash', 'operationcategory', 'orchestrationintensity', 'deterministic', 'provider']) {
  if (!merged.includes(requiredTerm)) throw new Error(`Missing canonical metering semantic: ${requiredTerm}`);
}
for (const requiredTerm of ['meteringstatetransition', 'meteringversioncontext', 'operationalquotaprofile', 'eventindex', 'cursor', 'lifecycleconsumptionmodifier']) {
  if (!merged.includes(requiredTerm)) throw new Error(`Missing hardening semantic: ${requiredTerm}`);
}
for (const forbiddenPattern of ['state.events.push', 'state.credits.available =']) {
  if (fileContents['src/features/trial/metering/services/metering-service.ts'].includes(forbiddenPattern)) throw new Error(`Mutable runtime pattern detected: ${forbiddenPattern}`);
}

console.log('Operational metering governance check passed.');
