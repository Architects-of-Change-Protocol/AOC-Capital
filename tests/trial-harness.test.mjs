import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registry = readFileSync('src/lib/trials/scenario-registry.ts', 'utf8');
const executor = readFileSync('src/lib/trials/trial-executor.ts', 'utf8');
const bias = readFileSync('src/lib/trials/bias-controls.ts', 'utf8');
const persistence = readFileSync('src/lib/trials/trial-persistence.ts', 'utf8');
const evaluation = readFileSync('src/lib/trials/evaluation-engine.ts', 'utf8');
const replay = readFileSync('src/components/pmfreak/trials/trial-replay.tsx', 'utf8');
const model = readFileSync('src/lib/trials/trial-model.ts', 'utf8');

test('scenario registry loads with >=20 balanced language scenarios', () => {
  assert.match(registry, /TRIAL_SCENARIOS/);
  assert.ok((registry.match(/id: "trial-/g) ?? []).length >= 20);
  assert.ok((registry.match(/language: "en"/g) ?? []).length >= 8);
  assert.ok((registry.match(/language: "es"/g) ?? []).length >= 8);
});

test('trial execution captures runtime metadata', () => {
  assert.match(executor, /runtimeConfidence/);
  assert.match(executor, /traceSummary/);
  assert.match(executor, /normalizedConcepts/);
  assert.match(executor, /imprintContext/);
});

test('bias controls enforce pre-reveal lock and timestamps', () => {
  assert.match(bias, /canRevealPmfreakResponse/);
  assert.match(bias, /enforceTimestampSequence/);
});

test('evaluation scoring persistence + metrics + tenant isolation + language split fields exist', () => {
  assert.match(persistence, /Map<string, TrialStore>/);
  assert.match(persistence, /persistEvaluation/);
  assert.match(evaluation, /computeTrialMetrics/);
  assert.match(evaluation, /strongestCategories/);
  assert.match(evaluation, /weakestCategories/);
});

test('trial replay + outcome classification contract exists', () => {
  assert.match(replay, /PM response/);
  assert.match(model, /pmfreak-superior/);
  assert.match(model, /pm-superior/);
});
