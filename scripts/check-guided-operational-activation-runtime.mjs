import { existsSync, readFileSync } from 'node:fs';

const required = [
  'src/features/trial/activation/state/activation-runtime-state.ts',
  'src/features/trial/activation/services/activation-runtime-service.ts',
  'src/features/trial/activation/signals/aha-moment.ts',
  'src/features/trial/activation/progression/activation-progression.ts',
  'src/features/trial/activation/scoring/activation-scoring.ts',
  'src/features/trial/activation/nudges/operational-nudges.ts',
  'src/features/trial/activation/utils/deterministic.ts',
  'src/features/trial/activation/utils/quota-posture.ts',
  'docs/architecture/guided-operational-activation-runtime.md',
];
for (const p of required) if (!existsSync(p)) throw new Error(`Missing required activation runtime artifact: ${p}`);
const merged = required.map((p) => readFileSync(p, 'utf8').toLowerCase()).join('\n');
for (const forbidden of ['step wizard','tutorial popup','click next','product tour']) {
  if (merged.includes(forbidden)) throw new Error(`Forbidden shallow onboarding concept detected: ${forbidden}`);
}
for (const requiredTerm of ['operationalactivationruntimestate','ahamomentdetectionresult','transitionchainhash','createcapabilitysnapshothash','evaluatequotaposture','deterministic']) {
  if (!merged.includes(requiredTerm)) throw new Error(`Missing required semantic: ${requiredTerm}`);
}
console.log('Guided operational activation runtime governance check passed.');
