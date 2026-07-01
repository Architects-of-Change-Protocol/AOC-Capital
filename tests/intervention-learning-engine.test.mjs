import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const types = fs.readFileSync('src/lib/operational-memory/intervention-learning/intervention-learning-types.ts', 'utf8');
const engine = fs.readFileSync('src/lib/operational-memory/intervention-learning/intervention-learning-engine.ts', 'utf8');
const manager = fs.readFileSync('src/lib/operational-memory/intervention-learning/intervention-learning-manager.ts', 'utf8');

test('learning contracts include required deterministic outputs', () => {
  for (const token of ['InterventionLearningRequest', 'InterventionLearningResult', 'InterventionOutcomeRecord', 'InterventionEffectivenessScore', 'LearningEvidenceBundle', 'AdaptiveBoundedAdjustment', 'InterventionDriftSignal']) assert.ok(types.includes(token));
});

test('engine includes bounded adaptation and drift logic', () => {
  assert.match(engine, /boundedAdjustments/);
  assert.match(engine, /driftSignals/);
  assert.match(engine, /governanceSafeLimitsApplied/);
});

test('manager exposes retrieval APIs', () => {
  for (const fn of ['retrieveInterventionLearning', 'retrieveInterventionEffectiveness', 'retrieveStakeholderResponsiveness', 'retrieveSequencingEffectiveness', 'retrieveRecoveryEffectiveness', 'retrieveFailurePatterns', 'retrieveCalibrationAdjustments', 'retrieveLearningDiagnostics', 'retrieveLearningNarratives']) assert.ok(manager.includes(fn));
});
