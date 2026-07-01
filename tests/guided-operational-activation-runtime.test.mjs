import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const stateFile = readFileSync('src/features/trial/activation/state/activation-runtime-state.ts', 'utf8');
const milestonesFile = readFileSync('src/features/trial/activation/milestones/activation-milestones.ts', 'utf8');
const ahaFile = readFileSync('src/features/trial/activation/signals/aha-moment.ts', 'utf8');
const progressionFile = readFileSync('src/features/trial/activation/progression/activation-progression.ts', 'utf8');
const scoringFile = readFileSync('src/features/trial/activation/scoring/activation-scoring.ts', 'utf8');
const nudgesFile = readFileSync('src/features/trial/activation/nudges/operational-nudges.ts', 'utf8');
const telemetryFile = readFileSync('src/features/trial/activation/telemetry/activation-telemetry.ts', 'utf8');
const deterministicFile = readFileSync('src/features/trial/activation/utils/deterministic.ts', 'utf8');
const serviceFile = readFileSync('src/features/trial/activation/services/activation-runtime-service.ts', 'utf8');
const meteringServiceFile = readFileSync('src/features/trial/metering/services/metering-service.ts', 'utf8');

test('state includes operational activation runtime semantics', () => {
  for (const term of ['OperationalActivationRuntimeState','currentActivationStage','operationalReadinessScore','activationRuntimeCursor','contextualNextActions','enterpriseExpansionReadiness']) assert.match(stateFile, new RegExp(term));
});

test('milestone engine includes operational cognition milestones and metadata', () => {
  for (const term of ['first_project_uploaded','first_multi-session_continuity','operational_intelligence_activated','replaySafeIdentity','progressionImpact','ahaPotential']) assert.match(milestonesFile, new RegExp(term));
});

test('aha moment detection is behavioral and deterministic', () => {
  for (const term of ['AhaMomentSignal','AhaMomentDetectionResult','continuity_recognition','operational_memory_reuse','repeated_multi_session_usage']) assert.match(ahaFile, new RegExp(term));
});

test('progression supports branching and blockers', () => {
  for (const term of ['ActivationProgressionResult','ProgressionDependency','ProgressionBlocker','OperationalActivationPath','reactivation','recovery']) assert.match(progressionFile, new RegExp(term));
});

test('scoring and nudges include contextual operational semantics', () => {
  for (const term of ['activationScore','operationalReadinessScore','enterpriseExpansionScore','ahaConfidenceScore']) assert.match(scoringFile, new RegExp(term));
  for (const term of ['upload_more_context','activate_continuity','generate_executive_synthesis']) assert.match(nudgesFile, new RegExp(term));
});

test('telemetry and service support activation orchestration and immutable runtime flow', () => {
  assert.match(telemetryFile, /activation_evolution/);
  assert.match(serviceFile, /advanceOperationalActivation/);
  assert.match(serviceFile, /Object\.freeze/);
});

test('hardening includes deterministic hashing, quota posture, and immutable transition finalization', () => {
  assert.match(deterministicFile, /createCapabilitySnapshotHash/);
  assert.match(deterministicFile, /createTransitionChainHash/);
  assert.match(meteringServiceFile, /createCapabilitySnapshotHash/);
  assert.match(meteringServiceFile, /evaluateOperationalQuotaPosture/);
  assert.doesNotMatch(meteringServiceFile, /nextState\.transitions\s*=/);
});

test('governance check validates activation runtime constraints', () => {
  const out = execSync('node scripts/check-guided-operational-activation-runtime.mjs', { encoding: 'utf8' });
  assert.match(out, /passed/i);
});
