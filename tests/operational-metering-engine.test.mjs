import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const meteringTypes = readFileSync('src/features/trial/metering/domain/metering-types.ts', 'utf8');
const meteringService = readFileSync('src/features/trial/metering/services/metering-service.ts', 'utf8');
const meteringEvents = readFileSync('src/features/trial/metering/events/metering-events.ts', 'utf8');
const policies = readFileSync('src/features/trial/metering/policies/consumption-policies.ts', 'utf8');
const guards = readFileSync('src/features/trial/metering/guards/metering-guards.ts', 'utf8');
const state = readFileSync('src/features/trial/metering/state/metering-state.ts', 'utf8');
const reconciliation = readFileSync('src/features/trial/metering/reconciliation/reconciliation.ts', 'utf8');
const consumptionEngine = readFileSync('src/features/trial/metering/engine/consumption-engine.ts', 'utf8');

test('metering types include canonical deterministic fields', () => {
  for (const field of ['eventId','runtimeCorrelationId','operationCategory','orchestrationIntensity','replaySafeHash','lineageMetadata','telemetryMetadata']) assert.match(meteringTypes, new RegExp(field));
});

test('policy layer includes category and intensity weighting semantics', () => {
  assert.match(policies, /categoryWeights/);
  assert.match(policies, /intensityMultipliers/);
  assert.match(policies, /capabilityMultipliers/);
  assert.doesNotMatch(policies.toLowerCase(), /openai|anthropic|stripe|invoice|token cost/);
});

test('services include registration, consumption, allowance and snapshot APIs', () => {
  for (const fn of ['registerOperationalUsage','consumeOperationalCredits','evaluateOperationalConsumption','generateUsageSnapshot','validateOperationalAllowance']) {
    assert.match(meteringService, new RegExp(fn));
  }
});

test('event layer includes deterministic identity and replay-safe hash behavior', () => {
  assert.match(meteringEvents, /createDeterministicEventId/);
  assert.match(meteringEvents, /createReplaySafeHash/);
  assert.match(meteringEvents, /runtimeCorrelationId/);
  assert.match(meteringEvents, /versionContext/);
});

test('guard layer includes abuse and runaway detection semantics', () => {
  for (const signal of ['runaway_orchestration_detection','ingestion_explosion_detection','abnormal_usage_spike','repeated_replay_attempt']) {
    assert.match(guards, new RegExp(signal));
  }
});

test('governance check enforces provider-agnostic deterministic semantics', () => {
  const out = execSync('node scripts/check-operational-metering-governance.mjs', { encoding: 'utf8' });
  assert.match(out, /passed/i);
});

test('runtime state includes transition, index, cursor, and quota profile semantics', () => {
  for (const semantic of ['MeteringStateTransition', 'eventIndex', 'cursor', 'quotaProfile', 'hashMeteringRuntimeState']) {
    assert.match(state, new RegExp(semantic));
  }
});

test('service register flow applies immutable nextState semantics', () => {
  assert.match(meteringService, /const nextState/);
  assert.match(meteringService, /return \{ state: nextState, event, transition/);
  assert.doesNotMatch(meteringService, /state\.events\.push/);
  assert.doesNotMatch(meteringService, /state\.credits\.available\s*=/);
});

test('consumption engine supports lifecycle-aware modifier defaults', () => {
  assert.match(consumptionEngine, /createLifecycleConsumptionModifier/);
  assert.match(consumptionEngine, /lifecycleContext/);
  assert.match(consumptionEngine, /multiplier:\s*1/);
});

test('reconciliation snapshot includes hardening diagnostics', () => {
  for (const field of ['transitionCount', 'cursorPosition', 'latestEventId', 'quotaPosture', 'versionContextPresent', 'immutableTransitionIntegrity']) {
    assert.match(reconciliation, new RegExp(field));
  }
});
